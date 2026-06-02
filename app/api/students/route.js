import { NextResponse } from 'next/server'
import { query, initDB } from '../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'

async function checkAuth(request) {
  const token = getTokenFromRequest(request)
  if (!token) return false
  const payload = await verifyToken(token)
  return !!payload
}

export async function GET(request) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  await initDB()
  const result = await query(`
    SELECT s.*, 
      COALESCE(json_agg(json_build_object('id', t.id, 'title', t.title, 'done', t.done)) FILTER (WHERE t.id IS NOT NULL), '[]') as tasks
    FROM students s
    LEFT JOIN tasks t ON t.student_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `)
  return NextResponse.json(result.rows)
}

export async function POST(request) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  await initDB()
  const body = await request.json()
  const { name, email, whatsapp, course, platform, purchase_date, duration, payment_status, progress, notes, hotmart_user_id } = body
  const result = await query(
    `INSERT INTO students (name, email, whatsapp, course, platform, purchase_date, duration, payment_status, progress, notes, hotmart_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (hotmart_user_id) DO UPDATE SET name=$1, email=$2, updated_at=NOW()
     RETURNING *`,
    [name, email, whatsapp || '', course || '', platform || 'Hotmart', purchase_date || null, duration || '1', payment_status || 'Aprovado', progress || 0, notes || '', hotmart_user_id || null]
  )
  return NextResponse.json(result.rows[0])
}
