import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSchemaHash?: string
}

// Force re-instantiation when the schema changes (after db:push)
// We use a simple check: if models exist on the client
function needsReinstantiation(client: PrismaClient | undefined): boolean {
  if (!client) return true
  // Check if new models exist
  const any = client as any
  return !any.series || !any.season || !any.episode || !any.character || !any.setting || !any.scene
}

if (needsReinstantiation(globalForPrisma.prisma)) {
  globalForPrisma.prisma = undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
