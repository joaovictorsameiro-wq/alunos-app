import { NextResponse } from 'next/server'
import { getAllHotmartStudents } from '../../../lib/hotmart'
import { query, initDB } from '../../../lib/db'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'

async function checkAuth(request) {
  const token = getTokenFromRequest(request)
  if (!token) return false
  return !!(await verifyToken(token))
}

export async function POST(request) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await initDB()

  try {
    const hotmartStudents = await getAllHotmartStudents()
    let synced = 0

    for (const hs of hotmartStudents) {
      const userId = hs.user_id
      const name = hs.name || 'Sem nome'
      const email = hs.email || ''
      const progress = hs.progress?.completed_percentage || 0
      const status = hs.status // ACTIVE, BLOCKED, OVERDUE
      const firstAccess = hs.first_access_date
        ? new Date(hs.first_access_date * 1000).toISOString().split('T')[0]
        : null

      if (!userId) continue

      await query(
        `INSERT INTO students (hotmart_user_id, name, email, progress, platform, payment_status, purchase_date)
         VALUES ($1, $2, $3, $4, 'Hotmart', $5, $6)
         ON CONFLICT (hotmart_user_id) DO UPDATE 
         SET name=$2, email=$3, progress=$4, payment_status=$5, updated_at=NOW()`,
        [
          userId,
          name,
          email,
          progress,
          status === 'ACTIVE' ? 'Aprovado' : status === 'OVERDUE' ? 'Pendente' : 'Bloqueado',
          firstAccess
        ]
      )
      synced++
    }

    return NextResponse.json({ ok: true, synced })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const students = await getAllHotmartStudents()
    return NextResponse.json({
      total: students.length,
      sample: students.slice(0, 2)
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
