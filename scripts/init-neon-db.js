/**
 * ==============================================================================
 * AEROTERRA H2 — NEON DATABASE AUTOMATED INITIALIZER (CLI)
 * ==============================================================================
 * Usage:
 *   node scripts/init-neon-db.js
 * Or with explicit connection string:
 *   DATABASE_URL="postgres://..." node scripts/init-neon-db.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env if present
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const connectionString = process.env.DATABASE_URL;

console.log('\n============================================================');
console.log('⚡ AEROTERRA H2 — NEON DATABASE INITIALIZER');
console.log('============================================================\n');

if (!connectionString) {
  console.error('❌ ОШИБКА: Переменная DATABASE_URL не найдена!');
  console.log('Пожалуйста, укажите строку подключения к базе Neon одним из способов:');
  console.log('  1) Создайте файл .env в корне проекта:');
  console.log('     DATABASE_URL=postgres://user:pass@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require');
  console.log('  2) Или запустите команду:');
  console.log('     DATABASE_URL="ваша_ссылка_neon" npm run db:init\n');
  process.exit(1);
}

// Mask sensitive credentials for safe logging
const maskedUrl = connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:********@');
console.log(`🔌 Подключение к Neon Postgres: ${maskedUrl}`);

async function initDatabase() {
  const startTime = Date.now();
  let sql;

  try {
    // Dynamic import of Neon serverless driver
    const { neon } = await import('@neondatabase/serverless');
    sql = neon(connectionString);
  } catch (err) {
    console.warn('⚠️  Не удалось загрузить @neondatabase/serverless, проверяем альтернативный драйвер...');
    try {
      const pg = await import('pg');
      const { Pool } = pg.default || pg;
      const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
      sql = async (queryText, params = []) => {
        const res = await pool.query(queryText, params);
        return res.rows;
      };
    } catch (pgErr) {
      console.error('❌ Ошибка загрузки драйверов PostgreSQL:', pgErr.message);
      console.log('Установите зависимости: npm install');
      process.exit(1);
    }
  }

  try {
    console.log('⏳ Тестирование соединения с Neon...');
    const pingRes = await sql`SELECT NOW() as current_time, current_database() as db_name, version() as pg_version`;
    const latency = Date.now() - startTime;
    console.log(`✅ Соединение успешно установлено! Задержка: ${latency} ms`);
    console.log(`   База данных: ${pingRes[0]?.db_name || 'neondb'}`);
    console.log(`   Версия: ${pingRes[0]?.pg_version?.split(' ')[0]} ${pingRes[0]?.pg_version?.split(' ')[1]}`);

    console.log('\n⏳ Чтение файла схемы scripts/schema.sql...');
    const schemaSqlPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');

    // Split SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`⏳ Применение DDL миграции (${statements.length} инструкций)...`);
    for (const stmt of statements) {
      if (stmt.startsWith('--')) continue;
      await sql(stmt);
    }
    console.log('✅ Таблицы [users, user_sessions, aircraft_configs, telemetry_logs] успешно созданы/обновлены!');

    // Check if demo user exists
    console.log('\n⏳ Проверка демонстрационной учётной записи...');
    const existingUsers = await sql`SELECT id, email, full_name, role FROM users WHERE email = 'pilot@aeroterra.aero' LIMIT 1`;
    
    if (existingUsers.length === 0) {
      const demoPasswordHash = await bcrypt.hash('AeroTerra2026!', 10);
      await sql`
        INSERT INTO users (email, password_hash, full_name, organization, role)
        VALUES (
          'pilot@aeroterra.aero',
          ${demoPasswordHash},
          'Капитан Алекс Воронов',
          'Aerospace Engineering Club / Test Pilot',
          'pilot'
        )
      `;
      console.log('✅ Создан тестовый аккаунт пилота:');
      console.log('   Email:    pilot@aeroterra.aero');
      console.log('   Пароль:   AeroTerra2026!');
    } else {
      console.log(`ℹ️  Тестовый аккаунт (${existingUsers[0].email}) уже существует.`);
    }

    // Verify user count
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM aircraft_configs) as configs_count
    `;
    console.log('\n📊 ТЕКУЩАЯ СТАТИСТИКА БАЗЫ NEON:');
    console.log(`   Пользователей в базе:     ${stats[0]?.users_count || 0}`);
    console.log(`   Сохранённых конфигураций: ${stats[0]?.configs_count || 0}`);

    console.log('\n🎉 Инициализация базы данных Neon успешно завершена!');
    console.log('Теперь проект готов к деплою на Vercel (команда: vercel --prod)\n');

  } catch (err) {
    console.error('\n❌ Ошибка при выполнении миграции в Neon:', err.message);
    if (err.detail) console.error('Детали:', err.detail);
    process.exit(1);
  }
}

initDatabase();
