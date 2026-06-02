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

  // Correct Hotmart OAuth endpoint
  const res = await fetch(
    'https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=' +
    process.env.HOTMART_CLIENT_ID +
    '&client_secret=' +
    process.env.HOTMART_CLIENT_SECRET,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const text = await res.text()
  
  if (!res.ok) {
    throw new Error(`Auth failed (${res.status}): ${text}`)
  }

  if (!text || text.trim() === '') {
    throw new Error(`Auth returned empty response (${res.status})`)
  }

  const data = JSON.parse(text)
  
  if (!data.access_token) {
    throw new Error(`No access_token in response: ${text}`)
  }

  cachedToken = data.access_token
  tokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000
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

  const text = await res.text()

  if (!res.ok) {
    throw new Error(`Students fetch failed (${res.status}): ${text}`)
  }

  const data = JSON.parse(text)
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
