-- Migration: ceo_realtime_select_policy
-- AILANE-CC-BRIEF-CEODASH-001
-- Adds a CEO-only SELECT policy on accounts.transactions
-- so Supabase Realtime can push new Monzo transactions to the CEO dashboard.
-- This is scoped to a single user for SELECT only — does NOT open accounts schema for general access.

CREATE POLICY "ceo_select_transactions"
ON accounts.transactions
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'mark@ailane.ai'
);
