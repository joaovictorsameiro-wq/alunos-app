import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export async function query(text, params) {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return res
  } finally {
    client.release()
  }
}

export async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      hotmart_user_id TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT,
      course TEXT,
      platform TEXT DEFAULT 'Hotmart',
      purchase_date DATE,
      duration TEXT DEFAULT '1',
      payment_status TEXT DEFAULT 'Aprovado',
      progress INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)
}
