/**
 * ==============================================================================
 * AEROTERRA H2 — NEON POSTGRESQL SERVERLESS CLIENT (EDGE & NODE COMPATIBLE)
 * ==============================================================================
 */

import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';

let neonClient = null;
let isNeonAvailable = false;

// In-Memory Fallback Store (for local testing before user inputs live Neon connection string)
const mockStore = {
  users: [
    {
      id: 'demo-pilot-001',
      email: 'pilot@aeroterra.aero',
      // Hash for 'AeroTerra2026!'
      password_hash: '$2a$10$o8k30bS2o9X68.rS0jXzTe7Yc2zLq4wZJ7Q/16dZvhF.6Qe9o2wOq',
      full_name: 'Капитан Алекс Воронов',
      organization: 'Aerospace Engineering Club / Test Flight',
      role: 'pilot',
      flight_hours: 142.5,
      created_at: new Date().toISOString()
    },
    {
      id: 'demo-engineer-002',
      email: 'engineer@aeroterra.aero',
      // Hash for 'AeroTerra2026!'
      password_hash: '$2a$10$o8k30bS2o9X68.rS0jXzTe7Yc2zLq4wZJ7Q/16dZvhF.6Qe9o2wOq',
      full_name: 'Инженер Елена Смирнова',
      organization: 'Department of Aerodynamics & Propulsion',
      role: 'engineer',
      flight_hours: 48.0,
      created_at: new Date().toISOString()
    }
  ],
  sessions: [],
  configs: [
    {
      id: 'config-demo-01',
      user_id: 'demo-pilot-001',
      name: 'Базовая Агро-Конфигурация ULV 1:1',
      scale_mode: 'full',
      active_mission: 'agro',
      payload_kg: 320,
      fuel_lh2_kg: 45,
      cruising_speed_kmh: 185,
      created_at: new Date().toISOString()
    }
  ]
};

/**
 * Initializes Neon Serverless driver
 */
async function getNeon() {
  if (neonClient) return neonClient;

  if (DATABASE_URL && DATABASE_URL.includes('neon.tech')) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      neonClient = neon(DATABASE_URL);
      isNeonAvailable = true;
      return neonClient;
    } catch (err) {
      console.warn('[DB] @neondatabase/serverless failed, falling back to mock or standard pg:', err.message);
    }
  }
  return null;
}

/**
 * Executes a SQL query against Neon or Mock Store
 */
export async function query(sqlText, params = []) {
  const neon = await getNeon();

  if (neon) {
    try {
      // Direct raw query via Neon serverless
      return await neon(sqlText, params);
    } catch (err) {
      console.error('[DB Query Error]', err.message);
      throw err;
    }
  }

  // Fallback to Mock Store if Neon connection string is not provided
  return executeMockQuery(sqlText, params);
}

/**
 * Mock SQL engine for instant offline prototyping
 */
function executeMockQuery(sqlText, params) {
  const text = sqlText.trim().toLowerCase();

  // 1. SELECT user by email
  if (text.includes('from users where email =')) {
    const email = params[0] || '';
    const user = mockStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return user ? [user] : [];
  }

  // 2. SELECT user by ID
  if (text.includes('from users where id =')) {
    const id = params[0];
    const user = mockStore.users.find(u => u.id === id);
    return user ? [user] : [];
  }

  // 3. INSERT user
  if (text.includes('insert into users')) {
    const [email, password_hash, full_name, organization, role] = params;
    const newUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      email,
      password_hash,
      full_name: full_name || 'Инженер AeroTerra',
      organization: organization || 'Aerospace Engineering Club',
      role: role || 'engineer',
      flight_hours: 0,
      created_at: new Date().toISOString()
    };
    mockStore.users.push(newUser);
    return [newUser];
  }

  // 4. SELECT configs for user
  if (text.includes('from aircraft_configs where user_id =')) {
    const userId = params[0];
    return mockStore.configs.filter(c => c.user_id === userId);
  }

  // 5. INSERT aircraft config
  if (text.includes('insert into aircraft_configs')) {
    const [userId, name, scaleMode, activeMission, payloadKg, fuelLh2Kg, cruisingSpeedKmh, customNodes] = params;
    const newConfig = {
      id: `cfg-${Date.now()}`,
      user_id: userId,
      name,
      scale_mode: scaleMode,
      active_mission: activeMission,
      payload_kg: payloadKg,
      fuel_lh2_kg: fuelLh2Kg,
      cruising_speed_kmh: cruisingSpeedKmh,
      custom_nodes: customNodes,
      created_at: new Date().toISOString()
    };
    mockStore.configs.push(newConfig);
    return [newConfig];
  }

  // 6. DB health / stats
  if (text.includes('count(*) from users')) {
    return [{
      users_count: mockStore.users.length,
      configs_count: mockStore.configs.length,
      status: 'mock_active'
    }];
  }

  return [];
}

/**
 * Checks connection health and latency to Neon
 */
export async function checkConnectionHealth() {
  const start = Date.now();
  if (DATABASE_URL && DATABASE_URL.includes('neon.tech')) {
    try {
      const neon = await getNeon();
      if (neon) {
        const res = await neon`SELECT NOW() as current_time, current_database() as db_name, version() as pg_version`;
        const latencyMs = Date.now() - start;
        return {
          connected: true,
          mode: 'neon_serverless',
          database: res[0]?.db_name || 'neondb',
          latencyMs,
          timestamp: res[0]?.current_time || new Date().toISOString()
        };
      }
    } catch (err) {
      return {
        connected: false,
        mode: 'neon_failed',
        error: err.message,
        latencyMs: Date.now() - start
      };
    }
  }

  return {
    connected: true,
    mode: 'in_memory_sandbox',
    database: 'mock_aeroterra_local',
    notice: 'DATABASE_URL не настроена в .env или Vercel. Используется локальный sandbox-режим.',
    latencyMs: 1,
    timestamp: new Date().toISOString()
  };
}

export default { query, checkConnectionHealth };
