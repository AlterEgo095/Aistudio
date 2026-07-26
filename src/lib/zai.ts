import ZAI from 'z-ai-web-dev-sdk'

let cachedClient: ZAI | null = null

export async function getZai(): Promise<ZAI> {
  if (cachedClient) return cachedClient
  cachedClient = await ZAI.create()
  return cachedClient
}
