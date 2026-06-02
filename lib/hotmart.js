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

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Falha ao autenticar com a Hotmart: ${err}`)
  }

  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

export async function getHotmartStudents(pageToken = null) {
  const token = await getHotmartToken()
  const subdomain = process.env.HOTMART_SUBDOMAIN

  let url = `${HOTMART_API_URL}/club/api/v1/users?subdomain=${subdomain}&max_results=50`
  if (pageToken) url += `&page_token=${pageToken}`

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro ao buscar alunos: ${err}`)
  }

  const data = await res.json()
  return {
    items: data.items || [],
    nextPageToken: data.page_info?.next_page_token || null,
    hasNext: !!data.page_info?.next_page_token
  }
}

export async function getAllHotmartStudents() {
  const all = []
  let pageToken = null
  let iterations = 0

  do {
    const result = await getHotmartStudents(pageToken)
    all.push(...result.items)
    pageToken = result.nextPageToken
    iterations++
  } while (pageToken && iterations < 20)

  return all
}
