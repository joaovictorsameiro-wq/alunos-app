import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

async function checkAuth(request) {
  const token = getTokenFromRequest(request)
  if (!token) return false
  return !!(await verifyToken(token))
}

export async function POST(request, { params }) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { title } = await request.json()
  const result = await query('INSERT INTO tasks (student_id, title) VALUES ($1, $2) RETURNING *', [params.id, title])
  return NextResponse.json(result.rows[0])
}

export async function PUT(request, { params }) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { taskId, done } = await request.json()
  const result = await query('UPDATE tasks SET done=$1 WHERE id=$2 AND student_id=$3 RETURNING *', [done, taskId, params.id])
  return NextResponse.json(result.rows[0])
}

export async function DELETE(request, { params }) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { taskId } = await request.json()
  await query('DELETE FROM tasks WHERE id=$1 AND student_id=$2', [taskId, params.id])
  return NextResponse.json({ ok: true })
}
