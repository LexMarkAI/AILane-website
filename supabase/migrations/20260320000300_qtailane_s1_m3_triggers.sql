-- ============================================================
-- QTAILANE STAGE 1 — MIGRATION 3: TRIGGERS AND ENFORCEMENT
-- Authority: QTAILANE-INV-001 (invariant enforcement)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- INV E-01: AUDIT TRAIL IMMUTABILITY
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qtailane_prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'INVARIANT VIOLATION E-01: Audit trail entries are immutable. UPDATE and DELETE are prohibited.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qtailane_audit_immutable_update
  BEFORE UPDATE ON qtailane_audit_log
  FOR EACH ROW EXECUTE FUNCTION qtailane_prevent_audit_mutation();

CREATE TRIGGER trg_qtailane_audit_immutable_delete
  BEFORE DELETE ON qtailane_audit_log
  FOR EACH ROW EXECUTE FUNCTION qtailane_prevent_audit_mutation();

-- ────────────────────────────────────────────────────────────
-- INV A-04: TEMPORAL MONOTONICITY
-- Posterior updates cannot be backdated.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qtailane_enforce_temporal_monotonicity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_posterior_update IS NOT NULL AND OLD.last_posterior_update IS NOT NULL THEN
    IF NEW.last_posterior_update < OLD.last_posterior_update THEN
      RAISE EXCEPTION 'INVARIANT VIOLATION A-04: Temporal monotonicity — posterior update timestamp cannot move backwards. Old: %, New: %',
        OLD.last_posterior_update, NEW.last_posterior_update;
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qtailane_temporal_monotonicity
  BEFORE UPDATE ON qtailane_probability_objects
  FOR EACH ROW EXECUTE FUNCTION qtailane_enforce_temporal_monotonicity();

-- ────────────────────────────────────────────────────────────
-- INV A-06: STATE TRANSITION LEGALITY
-- Only permitted state transitions allowed.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qtailane_enforce_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "CREATED": ["MONITORING", "PENDING_REVIEW", "EXPIRED"],
    "MONITORING": ["ACTIVE_TRADING", "PENDING_REVIEW", "FROZEN", "ABSTAIN", "EXPIRED"],
    "ACTIVE_TRADING": ["POSITION_LONG", "POSITION_SHORT", "MONITORING", "PENDING_REVIEW", "FROZEN", "ABSTAIN"],
    "POSITION_LONG": ["MONITORING", "ACTIVE_TRADING", "FROZEN", "RESOLVED_YES", "RESOLVED_NO", "RESOLVED_AMBIGUOUS"],
    "POSITION_SHORT": ["MONITORING", "ACTIVE_TRADING", "FROZEN", "RESOLVED_YES", "RESOLVED_NO", "RESOLVED_AMBIGUOUS"],
    "FROZEN": ["MONITORING", "ACTIVE_TRADING", "POSITION_LONG", "POSITION_SHORT", "PENDING_REVIEW", "RESOLVED_YES", "RESOLVED_NO", "RESOLVED_AMBIGUOUS"],
    "PENDING_REVIEW": ["MONITORING", "ACTIVE_TRADING", "FROZEN", "ABSTAIN", "EXPIRED"],
    "ABSTAIN": ["MONITORING", "EXPIRED", "RESOLVED_YES", "RESOLVED_NO", "RESOLVED_AMBIGUOUS"]
  }'::JSONB;
  allowed TEXT[];
BEGIN
  IF OLD.action_state IS DISTINCT FROM NEW.action_state THEN
    -- Terminal states cannot transition
    IF OLD.action_state IN ('RESOLVED_YES', 'RESOLVED_NO', 'RESOLVED_AMBIGUOUS', 'EXPIRED') THEN
      RAISE EXCEPTION 'INVARIANT VIOLATION A-06: State transition from terminal state % is prohibited.', OLD.action_state;
    END IF;

    -- Check transition is in allowed list
    SELECT array_agg(value::TEXT) INTO allowed
    FROM jsonb_array_elements_text(valid_transitions -> OLD.action_state::TEXT);

    IF allowed IS NULL OR NOT (NEW.action_state::TEXT = ANY(allowed)) THEN
      RAISE EXCEPTION 'INVARIANT VIOLATION A-06: State transition from % to % is not permitted. Allowed transitions: %',
        OLD.action_state, NEW.action_state, allowed;
    END IF;

    -- Record the transition
    NEW.previous_action_state = OLD.action_state;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qtailane_state_transition
  BEFORE UPDATE ON qtailane_probability_objects
  FOR EACH ROW EXECUTE FUNCTION qtailane_enforce_state_transition();

-- ────────────────────────────────────────────────────────────
-- INV F-01: CIRCUIT BREAKER / ACTION STATE EXCLUSION
-- No POSITION_LONG or POSITION_SHORT while CB is active.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qtailane_cb_freeze_positions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND (OLD.status IS NULL OR OLD.status != 'ACTIVE') THEN
    -- Freeze all open positions in the affected scope
    UPDATE qtailane_positions
    SET is_frozen = true,
        frozen_by_cb = NEW.cb_type,
        updated_at = now()
    WHERE is_open = true
      AND is_frozen = false
      AND (NEW.affected_scope = 'ALL' OR instrument = NEW.affected_scope);

    -- Freeze probability objects in trading states
    UPDATE qtailane_probability_objects
    SET action_state = 'FROZEN',
        previous_action_state = action_state,
        updated_at = now()
    WHERE action_state IN ('POSITION_LONG', 'POSITION_SHORT', 'ACTIVE_TRADING')
      AND (NEW.affected_scope = 'ALL' OR category::TEXT = NEW.affected_scope OR venue_contract_id = NEW.affected_scope);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qtailane_cb_freeze
  AFTER UPDATE ON qtailane_circuit_breakers
  FOR EACH ROW EXECUTE FUNCTION qtailane_cb_freeze_positions();

CREATE TRIGGER trg_qtailane_cb_freeze_insert
  AFTER INSERT ON qtailane_circuit_breakers
  FOR EACH ROW
  WHEN (NEW.status = 'ACTIVE')
  EXECUTE FUNCTION qtailane_cb_freeze_positions();

-- ────────────────────────────────────────────────────────────
-- CLAIM CLUSTER IMMUTABILITY
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qtailane_prevent_claim_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'INVARIANT VIOLATION B-03: Claim clusters are immutable after creation. UPDATE is prohibited.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qtailane_claim_immutable
  BEFORE UPDATE ON qtailane_claim_clusters
  FOR EACH ROW EXECUTE FUNCTION qtailane_prevent_claim_mutation();

-- ────────────────────────────────────────────────────────────
-- TRADE IMMUTABILITY
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qtailane_prevent_trade_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Financial record integrity: Trade records are immutable. UPDATE is prohibited.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qtailane_trade_immutable
  BEFORE UPDATE ON qtailane_trades
  FOR EACH ROW EXECUTE FUNCTION qtailane_prevent_trade_mutation();

-- ────────────────────────────────────────────────────────────
-- REGIME STATE IMMUTABILITY
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qtailane_prevent_regime_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_immutable = true THEN
    RAISE EXCEPTION 'Regime state records are immutable after creation.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qtailane_regime_immutable
  BEFORE UPDATE ON qtailane_regime_states
  FOR EACH ROW EXECUTE FUNCTION qtailane_prevent_regime_mutation();

-- ────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at TIMESTAMPS
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qtailane_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_qtailane_positions_updated
  BEFORE UPDATE ON qtailane_positions
  FOR EACH ROW EXECUTE FUNCTION qtailane_set_updated_at();

CREATE TRIGGER trg_qtailane_cb_updated
  BEFORE UPDATE ON qtailane_circuit_breakers
  FOR EACH ROW EXECUTE FUNCTION qtailane_set_updated_at();

CREATE TRIGGER trg_qtailane_model_updated
  BEFORE UPDATE ON qtailane_model_registry
  FOR EACH ROW EXECUTE FUNCTION qtailane_set_updated_at();

CREATE TRIGGER trg_qtailane_base_rates_updated
  BEFORE UPDATE ON qtailane_base_rates
  FOR EACH ROW EXECUTE FUNCTION qtailane_set_updated_at();
