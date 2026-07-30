// Persistent Cache Module — Hash-based caching for generated assets
// Eliminates redundant API calls and enables instant reproduction

import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

const CACHE_DIR = '/home/z/my-project/tmp/ai-cache'

export interface CacheEntry {
  key: string
  path: string
  createdAt: number
  size: number
  type: 'image' | 'audio' | 'video'
}

// Ensure cache directory exists
async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  await fs.mkdir(path.join(CACHE_DIR, 'images'), { recursive: true })
  await fs.mkdir(path.join(CACHE_DIR, 'audios'), { recursive: true })
  await fs.mkdir(path.join(CACHE_DIR, 'videos'), { recursive: true })
}

/**
 * Get the subdirectory name for a cache type.
 * 'image' → 'images', 'audio' → 'audios', 'video' → 'videos'
 */
function getCacheSubdir(type: 'image' | 'audio' | 'video'): string {
  return type + 's'
}

/**
 * Generate a stable hash key from arbitrary content.
 * Used to identify cached assets.
 */
export function hashKey(...parts: (string | number | boolean | undefined)[]): string {
  const content = parts.map(p => String(p ?? '')).join('|')
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 24)
}

/**
 * Check if a cached asset exists.
 * Returns the file path if found, null otherwise.
 */
export async function getCachedAsset(key: string, type: 'image' | 'audio' | 'video'): Promise<string | null> {
  try {
    const ext = type === 'image' ? 'png' : type === 'audio' ? 'wav' : 'mp4'
    const cachedPath = path.join(CACHE_DIR, type + 's', `${key}.${ext}`)
    const stat = await fs.stat(cachedPath)
    if (stat.size > 0) {
      return cachedPath
    }
  } catch {}
  return null
}

/**
 * Save an asset to cache.
 */
export async function cacheAsset(key: string, type: 'image' | 'audio' | 'video', data: Buffer | string): Promise<string> {
  await ensureCacheDir()
  const ext = type === 'image' ? 'png' : type === 'audio' ? 'wav' : 'mp4'
  const cachedPath = path.join(CACHE_DIR, type + 's', `${key}.${ext}`)
  if (typeof data === 'string') {
    await fs.writeFile(cachedPath, Buffer.from(data, 'base64'))
  } else {
    await fs.writeFile(cachedPath, data)
  }
  return cachedPath
}

/**
 * Get cache statistics.
 */
export async function getCacheStats(): Promise<{ totalFiles: number; totalSize: number; byType: Record<string, number> }> {
  const stats = { totalFiles: 0, totalSize: 0, byType: { images: 0, audio: 0, video: 0 } }
  try {
    for (const type of ['images', 'audio', 'video']) {
      const dir = path.join(CACHE_DIR, type)
      const files = await fs.readdir(dir).catch(() => [])
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = await fs.stat(filePath)
        stats.totalFiles++
        stats.totalSize += stat.size
        stats.byType[type]++
      }
    }
  } catch {}
  return stats
}

/**
 * Clear cache older than maxAgeMs.
 */
export async function clearOldCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  let cleared = 0
  const now = Date.now()
  try {
    for (const type of ['images', 'audio', 'video']) {
      const dir = path.join(CACHE_DIR, type)
      const files = await fs.readdir(dir).catch(() => [])
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = await fs.stat(filePath)
        if (now - stat.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath)
          cleared++
        }
      }
    }
  } catch {}
  return cleared
}
