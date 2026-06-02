import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

async function checkAuth(request) {
  const token = getTokenFromRequest(request)
  if (!token) return false
  return !!(await verifyToken(token))
}

export async function GET(request, { params }) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = params
  const s = await query(`SELECT s.*, COALESCE(json_agg(json_build_object('id', t.id, 'title', t.title, 'done', t.done)) FILTER (WHERE t.id IS NOT NULL), '[]') as tasks FROM students s LEFT JOIN tasks t ON t.student_id = s.id WHERE s.id=$1 GROUP BY s.id`, [id])
  if (!s.rows.length) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(s.rows[0])
}

export async function PUT(request, { params }) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = params
  const body = await request.json()
  const { name, email, whatsapp, course, platform, purchase_date, duration, payment_status, progress, notes } = body
  const result = await query(
    `UPDATE students SET name=$1, email=$2, whatsapp=$3, course=$4, platform=$5, purchase_date=$6, duration=$7, payment_status=$8, progress=$9, notes=$10, updated_at=NOW() WHERE id=$11 RETURNING *`,
    [name, email, whatsapp, course, platform, purchase_date, duration, payment_status, progress, notes, id]
  )
  return NextResponse.json(result.rows[0])
}

export async function DELETE(request, { params }) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  await query('DELETE FROM students WHERE id=$1', [params.id])
  return NextResponse.json({ ok: true })
}
