-- ============================================================
-- QTAILANE STAGE 1 — ROLLBACK PROCEDURE (§10)
-- USE ONLY IF Stage 1 must be completely reversed.
-- Estimated rollback time: < 5 minutes.
-- No Ailane core data is affected (no cross-schema dependencies).
-- ============================================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS trg_qtailane_audit_immutable_update ON qtailane_audit_log;
DROP TRIGGER IF EXISTS trg_qtailane_audit_immutable_delete ON qtailane_audit_log;
DROP TRIGGER IF EXISTS trg_qtailane_temporal_monotonicity ON qtailane_probability_objects;
DROP TRIGGER IF EXISTS trg_qtailane_state_transition ON qtailane_probability_objects;
DROP TRIGGER IF EXISTS trg_qtailane_cb_freeze ON qtailane_circuit_breakers;
DROP TRIGGER IF EXISTS trg_qtailane_cb_freeze_insert ON qtailane_circuit_breakers;
DROP TRIGGER IF EXISTS trg_qtailane_claim_immutable ON qtailane_claim_clusters;
DROP TRIGGER IF EXISTS trg_qtailane_trade_immutable ON qtailane_trades;
DROP TRIGGER IF EXISTS trg_qtailane_regime_immutable ON qtailane_regime_states;
DROP TRIGGER IF EXISTS trg_qtailane_positions_updated ON qtailane_positions;
DROP TRIGGER IF EXISTS trg_qtailane_cb_updated ON qtailane_circuit_breakers;
DROP TRIGGER IF EXISTS trg_qtailane_model_updated ON qtailane_model_registry;
DROP TRIGGER IF EXISTS trg_qtailane_base_rates_updated ON qtailane_base_rates;

-- Drop functions
DROP FUNCTION IF EXISTS qtailane_prevent_audit_mutation();
DROP FUNCTION IF EXISTS qtailane_enforce_temporal_monotonicity();
DROP FUNCTION IF EXISTS qtailane_enforce_state_transition();
DROP FUNCTION IF EXISTS qtailane_cb_freeze_positions();
DROP FUNCTION IF EXISTS qtailane_prevent_claim_mutation();
DROP FUNCTION IF EXISTS qtailane_prevent_trade_mutation();
DROP FUNCTION IF EXISTS qtailane_prevent_regime_mutation();
DROP FUNCTION IF EXISTS qtailane_set_updated_at();
DROP FUNCTION IF EXISTS qtailane_purge_expired_market_data();
DROP FUNCTION IF EXISTS qtailane_schema_separation_audit();

-- Drop tables (reverse FK order)
DROP TABLE IF EXISTS qtailane_audit_log CASCADE;
DROP TABLE IF EXISTS qtailane_backtest_results CASCADE;
DROP TABLE IF EXISTS qtailane_kl_divergence_log CASCADE;
DROP TABLE IF EXISTS qtailane_trades CASCADE;
DROP TABLE IF EXISTS qtailane_positions CASCADE;
DROP TABLE IF EXISTS qtailane_claim_clusters CASCADE;
DROP TABLE IF EXISTS qtailane_probability_objects CASCADE;
DROP TABLE IF EXISTS qtailane_market_data CASCADE;
DROP TABLE IF EXISTS qtailane_circuit_breakers CASCADE;
DROP TABLE IF EXISTS qtailane_regime_states CASCADE;
DROP TABLE IF EXISTS qtailane_base_rates CASCADE;
DROP TABLE IF EXISTS qtailane_model_registry CASCADE;

-- Drop enums
DROP TYPE IF EXISTS qtailane_action_state;
DROP TYPE IF EXISTS qtailane_source_class;
DROP TYPE IF EXISTS qtailane_cb_type;
DROP TYPE IF EXISTS qtailane_cb_status;
DROP TYPE IF EXISTS qtailane_change_tier;
DROP TYPE IF EXISTS qtailane_volatility_state;
DROP TYPE IF EXISTS qtailane_venue;
DROP TYPE IF EXISTS qtailane_order_type;
DROP TYPE IF EXISTS qtailane_direction;
DROP TYPE IF EXISTS qtailane_event_category;
