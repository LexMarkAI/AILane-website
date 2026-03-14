-- Migration: add_accounts_transactions_to_realtime
-- AILANE-CC-BRIEF-CEODASH-001
-- Adds accounts.transactions to the Supabase Realtime publication
-- so that new Monzo webhook transactions appear instantly on the CEO dashboard.

ALTER PUBLICATION supabase_realtime ADD TABLE accounts.transactions;
