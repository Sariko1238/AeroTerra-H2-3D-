/**
 * ==============================================================================
 * AEROTERRA H2 — VERCEL SERVERLESS FUNCTION: /api/auth/me
 * ==============================================================================
 */

import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aeroterra-h2-cyber-secret-key-2026';

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Метод не поддерживается. Используйте GET.' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Отсутствует или недействителен токен авторизации (Bearer token).'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error: 'Срок действия сессии истёк или токен повреждён. Пожалуйста, войдите снова.'
      });
    }

    // Fetch fresh user data from Neon Postgres
    const users = await query('SELECT id, email, full_name, organization, role, flight_hours, created_at, last_login FROM users WHERE id = $1 LIMIT 1', [decoded.userId]);

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден в базе данных.'
      });
    }

    const user = users[0];

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        organization: user.organization,
        role: user.role,
        flightHours: user.flight_hours || 0,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (err) {
    console.error('Session verify error:', err);
    return res.status(500).json({
      success: false,
      error: 'Ошибка при проверке сессии: ' + err.message
    });
  }
}
