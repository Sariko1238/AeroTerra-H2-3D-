/**
 * ==============================================================================
 * AEROTERRA H2 — VERCEL SERVERLESS FUNCTION: /api/auth/login
 * ==============================================================================
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aeroterra-h2-cyber-secret-key-2026';

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Метод не поддерживается. Используйте POST.' });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Пожалуйста, введите Email и Пароль для входа.'
      });
    }

    const emailNormalized = email.trim().toLowerCase();

    // Query user from Neon Postgres
    const users = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [emailNormalized]);

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь с таким email не найден. Проверьте адрес или зарегистрируйтесь.'
      });
    }

    const user = users[0];

    // Verify bcrypt password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверный пароль. Попробуйте снова или используйте демо-аккаунт.'
      });
    }

    // Update last_login timestamp in Neon if live
    try {
      await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    } catch (ignore) {}

    // Sign JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Успешная авторизация в системе AeroTerra H2!',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        organization: user.organization,
        role: user.role,
        flightHours: user.flight_hours || 0,
        createdAt: user.created_at,
        lastLogin: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Ошибка сервера при авторизации: ' + err.message
    });
  }
}
