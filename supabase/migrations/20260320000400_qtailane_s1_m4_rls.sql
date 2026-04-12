-- ============================================================
-- QTAILANE STAGE 1 — MIGRATION 4: ROW-LEVEL SECURITY
-- Authority: QTAILANE-GOV-002 Part VII / BUILD-001 §2.2
-- CRITICAL: QTAiLane RLS is SEPARATE from Ailane core RLS.
-- ============================================================

-- Enable RLS on all qtailane_ tables
ALTER TABLE qtailane_probability_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_claim_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_regime_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_circuit_breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_kl_divergence_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_backtest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_base_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE qtailane_audit_log ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- READ policies — authenticated users can read all qtailane_ data
-- ────────────────────────────────────────────────────────────
CREATE POLICY qtailane_read_prob_objects ON qtailane_probability_objects FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_claims ON qtailane_claim_clusters FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_regime ON qtailane_regime_states FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_positions ON qtailane_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_trades ON qtailane_trades FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_market_data ON qtailane_market_data FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_cb ON qtailane_circuit_breakers FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_kl ON qtailane_kl_divergence_log FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_backtest ON qtailane_backtest_results FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_models ON qtailane_model_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_base_rates ON qtailane_base_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY qtailane_read_audit ON qtailane_audit_log FOR SELECT TO authenticated USING (true);

-- ────────────────────────────────────────────────────────────
-- WRITE policies — service_role only (Edge Functions use service_role key)
-- The service_role bypasses RLS by default in Supabase.
-- Authenticated users cannot INSERT/UPDATE/DELETE.
-- ────────────────────────────────────────────────────────────

-- AUDIT LOG: append-only for service role. No update/delete via RLS either.
CREATE POLICY qtailane_audit_insert ON qtailane_audit_log FOR INSERT TO authenticated WITH CHECK (false);
