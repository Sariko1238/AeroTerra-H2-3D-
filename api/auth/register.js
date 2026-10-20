/**
 * ==============================================================================
 * AEROTERRA H2 — VERCEL SERVERLESS FUNCTION: /api/auth/register
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
    const { email, password, fullName, organization, role } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Пожалуйста, заполните обязательные поля: Email и Пароль.'
      });
    }

    const emailNormalized = email.trim().toLowerCase();

    // Check basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalized)) {
      return res.status(400).json({
        success: false,
        error: 'Указан некорректный адрес электронной почты.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Пароль должен содержать не менее 6 символов.'
      });
    }

    // Check if user already exists in Neon DB
    const existing = await query('SELECT id FROM users WHERE email = $1', [emailNormalized]);
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Пользователь с таким email уже зарегистрирован в системе AeroTerra.'
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userFullName = fullName ? fullName.trim() : 'Инженер AeroTerra';
    const userOrg = organization ? organization.trim() : 'Aerospace Engineering Club';
    const userRole = role || 'engineer';

    // Insert new user into Neon DB
    const insertResult = await query(
      `INSERT INTO users (email, password_hash, full_name, organization, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, full_name, organization, role, flight_hours, created_at`,
      [emailNormalized, passwordHash, userFullName, userOrg, userRole]
    );

    const newUser = insertResult[0];

    // Sign JWT token
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.full_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Учётная запись инженера успешно создана в базе Neon!',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        organization: newUser.organization,
        role: newUser.role,
        flightHours: newUser.flight_hours || 0,
        createdAt: newUser.created_at
      }
    });

  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Ошибка сервера при регистрации пользователя: ' + err.message
    });
  }
}
