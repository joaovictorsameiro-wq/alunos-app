import { NextResponse } from 'next/server'
import { getAllHotmartStudents, getStudentProgress } from '../../../lib/hotmart'
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
      const progress = await getStudentProgress(hs.ukey || hs.user?.ukey)
      const userId = hs.ukey || hs.user?.ukey
      const name = hs.name || hs.user?.name || 'Sem nome'
      const email = hs.email || hs.user?.email || ''

      if (!userId || !email) continue

      await query(
        `INSERT INTO students (hotmart_user_id, name, email, progress, platform)
         VALUES ($1, $2, $3, $4, 'Hotmart')
         ON CONFLICT (hotmart_user_id) DO UPDATE SET name=$2, email=$3, progress=COALESCE($4, students.progress), updated_at=NOW()`,
        [userId, name, email, progress]
      )
      synced++
    }

    return NextResponse.json({ ok: true, synced })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request) {
  if (!await checkAuth(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const students = await getAllHotmartStudents()
    return NextResponse.json({ total: students.length, students: students.slice(0, 5) })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
