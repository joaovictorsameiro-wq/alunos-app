const HOTMART_TOKEN_URL = 'https://api-sec-vlc.hotmart.com/security/oauth/token'
const HOTMART_API_URL = 'https://developers.hotmart.com'

let cachedToken = null
let tokenExpiry = null

export async function getHotmartToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken
  }

  const basic = Buffer.from(
    `${process.env.HOTMART_CLIENT_ID}:${process.env.HOTMART_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${HOTMART_TOKEN_URL}?grant_type=client_credentials`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/json'
    }
  })

  if (!res.ok) throw new Error('Falha ao autenticar com a Hotmart')

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

export async function getHotmartStudents(page = 0) {
  const token = await getHotmartToken()
  const subdomain = process.env.HOTMART_SUBDOMAIN

  const res = await fetch(
    `${HOTMART_API_URL}/club/api/v1/users?subdomain=${subdomain}&page=${page}&size=50`,
    { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
  )

  if (!res.ok) return { items: [], hasNext: false }
  const data = await res.json()
  return {
    items: data.items || [],
    hasNext: data.page_info?.has_next_page || false,
    nextPage: (data.page_info?.next_page_token) || null
  }
}

export async function getStudentProgress(userId) {
  try {
    const token = await getHotmartToken()
    const subdomain = process.env.HOTMART_SUBDOMAIN

    const res = await fetch(
      `${HOTMART_API_URL}/club/api/v1/users/${userId}/lessons?subdomain=${subdomain}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    )

    if (!res.ok) return null
    const data = await res.json()
    const lessons = data.lessons || []
    if (!lessons.length) return 0

    const completed = lessons.filter(l => l.is_completed).length
    return Math.round((completed / lessons.length) * 100)
  } catch {
    return null
  }
}

export async function getAllHotmartStudents() {
  const all = []
  let page = 0
  let hasNext = true

  while (hasNext && page < 10) {
    const result = await getHotmartStudents(page)
    all.push(...result.items)
    hasNext = result.hasNext
    page++
  }

  return all
}
