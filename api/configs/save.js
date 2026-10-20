/**
 * ==============================================================================
 * AEROTERRA H2 — VERCEL SERVERLESS FUNCTION: /api/configs/save
 * ==============================================================================
 */

import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aeroterra-h2-cyber-secret-key-2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Метод не поддерживается.' });

  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { name, scaleMode, activeMission, payloadKg, fuelLh2Kg, cruisingSpeedKmh, customNodes } = req.body || {};

    if (!name) {
      return res.status(400).json({ success: false, error: 'Укажите название конфигурации.' });
    }

    const saved = await query(
      `INSERT INTO aircraft_configs 
       (user_id, name, scale_mode, active_mission, payload_kg, fuel_lh2_kg, cruising_speed_kmh, custom_nodes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        decoded.userId,
        name.trim(),
        scaleMode || 'full',
        activeMission || 'agro',
        parseFloat(payloadKg) || 320,
        parseFloat(fuelLh2Kg) || 45,
        parseFloat(cruisingSpeedKmh) || 185,
        JSON.stringify(customNodes || {})
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Конфигурация самолёта успешно сохранена в облаке Neon!',
      config: saved[0]
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
