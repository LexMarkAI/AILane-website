-- ============================================================
-- QTAILANE STAGE 1 — MIGRATION 1: ENUMS AND CUSTOM TYPES
-- Authority: QTAILANE-BUILD-001 Stage 1 / QTAILANE-MTH-005 §2.2
-- ============================================================

-- Probability object action states (INV A-05: Action State Validity)
CREATE TYPE qtailane_action_state AS ENUM (
  'CREATED',
  'MONITORING',
  'ACTIVE_TRADING',
  'POSITION_LONG',
  'POSITION_SHORT',
  'FROZEN',
  'PENDING_REVIEW',
  'ABSTAIN',
  'RESOLVED_YES',
  'RESOLVED_NO',
  'RESOLVED_AMBIGUOUS',
  'EXPIRED'
);

-- Evidence source independence classification (MTH-005 §3.1)
CREATE TYPE qtailane_source_class AS ENUM (
  'PRIMARY_WIRE',
  'PRIMARY_OFFICIAL',
  'PRIMARY_SATELLITE',
  'PRIMARY_ECONOMIC',
  'DERIVATIVE_NARRATIVE',
  'MARKET_DERIVED',
  'UNCLASSIFIED'
);

-- Circuit breaker types (GOV-002 Part V)
CREATE TYPE qtailane_cb_type AS ENUM (
  'CB1_CALIBRATION_DRIFT',
  'CB2_MODEL_DIVERGENCE',
  'CB3_DATA_FEED_FAILURE',
  'CB4_VOLATILITY_SHOCK',
  'CB5_REFLEXIVITY',
  'CB6_MODEL_UNCERTAINTY_SPIKE',
  'CB7_MANUAL_HALT'
);

-- Circuit breaker status
CREATE TYPE qtailane_cb_status AS ENUM (
  'INACTIVE',
  'ACTIVE',
  'RESUMING'
);

-- Change control tier (GOV-002 Part II)
CREATE TYPE qtailane_change_tier AS ENUM (
  'TIER_1_PARAMETER',
  'TIER_2_MODEL',
  'TIER_3_ARCHITECTURE'
);

-- Volatility state for regime classification (MTH-005 §5)
CREATE TYPE qtailane_volatility_state AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'EXTREME'
);

-- Trade venue
CREATE TYPE qtailane_venue AS ENUM (
  'POLYMARKET',
  'IG_MARKETS',
  'KALSHI',
  'PAPER'
);

-- Order type
CREATE TYPE qtailane_order_type AS ENUM (
  'MARKET',
  'LIMIT',
  'STOP',
  'TRAILING_STOP'
);

-- Trade direction
CREATE TYPE qtailane_direction AS ENUM (
  'BUY',
  'SELL'
);

-- Event category for base rates (MTH-005 §3.4)
CREATE TYPE qtailane_event_category AS ENUM (
  'ELECTORAL',
  'CENTRAL_BANK',
  'GEOPOLITICAL',
  'SCIENTIFIC_REGULATORY',
  'CORPORATE_EVENT',
  'ECONOMIC_DATA',
  'OTHER'
);
