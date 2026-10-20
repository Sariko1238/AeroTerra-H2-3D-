-- ==============================================================================
-- AEROTERRA H2 — NEON POSTGRESQL DATABASE SCHEMA
-- Compatible with Neon Serverless Postgres (Pooler & Direct Endpoints)
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    organization VARCHAR(200) DEFAULT 'Aerospace Engineering Club',
    role VARCHAR(50) DEFAULT 'engineer', -- 'engineer', 'pilot', 'flight_controller', 'investor', 'admin'
    avatar_url TEXT DEFAULT '',
    flight_hours NUMERIC(8, 2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. USER SESSIONS TABLE (For token management & audit log)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_preview VARCHAR(32) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);

-- 3. AIRCRAFT SAVED CONFIGURATIONS TABLE (User custom specs from 3D Hangar)
CREATE TABLE IF NOT EXISTS aircraft_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT DEFAULT '',
    scale_mode VARCHAR(20) DEFAULT 'full', -- 'full' (1:1) or 'rc' (1:5)
    active_mission VARCHAR(30) DEFAULT 'agro', -- 'agro' or 'fire'
    payload_kg NUMERIC(8, 2) DEFAULT 320.0,
    fuel_lh2_kg NUMERIC(8, 2) DEFAULT 45.0,
    cruising_speed_kmh NUMERIC(8, 2) DEFAULT 185.0,
    custom_nodes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_configs_user_id ON aircraft_configs(user_id);

-- 4. TELEMETRY & BLACKBOX AUDIT LOG (Flight test telemetry)
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    altitude_m NUMERIC(8, 2),
    airspeed_kmh NUMERIC(8, 2),
    h2_pressure_bar NUMERIC(8, 2),
    fuel_cell_kw NUMERIC(8, 2),
    battery_soc_pct NUMERIC(5, 2),
    event_type VARCHAR(50) DEFAULT 'TELEMETRY_SAMPLE',
    event_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry_logs(created_at DESC);
