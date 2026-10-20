/**
 * ==============================================================================
 * AEROTERRA H2 — VERCEL SERVERLESS FUNCTION: /api/configs/list
 * ==============================================================================
 */

import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aeroterra-h2-cyber-secret-key-2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Метод не поддерживается.' });

  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const configs = await query(
      `SELECT id, name, description, scale_mode, active_mission, payload_kg, fuel_lh2_kg, cruising_speed_kmh, custom_nodes, created_at 
       FROM aircraft_configs 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [decoded.userId]
    );

    return res.status(200).json({
      success: true,
      configs: configs || []
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
