/**
 * ==============================================================================
 * AEROTERRA H2 — VERCEL SERVERLESS FUNCTION: /api/db-health
 * ==============================================================================
 */

import { checkConnectionHealth, query } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const health = await checkConnectionHealth();

    let stats = { users_count: 0, configs_count: 0 };
    try {
      const statsRes = await query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as users_count,
          (SELECT COUNT(*) FROM aircraft_configs) as configs_count
      `);
      if (statsRes && statsRes[0]) {
        stats = statsRes[0];
      }
    } catch (ignore) {}

    return res.status(200).json({
      success: true,
      service: 'AeroTerra H2 Cloud Telemetry & Auth Gateway',
      version: '2.0.0',
      database: {
        provider: 'Neon Serverless PostgreSQL',
        status: health.connected ? 'ONLINE' : 'DEGRADED',
        mode: health.mode,
        databaseName: health.database || 'neondb',
        latencyMs: health.latencyMs,
        notice: health.notice || null,
        stats: {
          registeredEngineers: parseInt(stats.users_count || 0, 10),
          savedConfigurations: parseInt(stats.configs_count || 0, 10)
        }
      },
      serverTimestamp: new Date().toISOString()
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Ошибка проверки статуса базы данных: ' + err.message
    });
  }
}
