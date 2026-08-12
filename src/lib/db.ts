import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

/**
 * Prisma client backed by Turso (libSQL).
 *
 * Turso is a SQLite-compatible edge database. We connect via the
 * @prisma/adapter-libsql driver adapter, which takes a config object:
 *   - url:       the libsql://... URL  (env: DATABASE_URL)
 *   - authToken: the Turso auth token   (env: DATABASE_AUTH_TOKEN)
 *
 * In local dev without Turso credentials, we fall back to a local
 * SQLite file so the app still runs offline.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  const log = process.env.NODE_ENV === 'production'
    ? ['error', 'warn']
    : ['query']

  // If we have a libsql:// URL, use the Turso adapter.
  if (databaseUrl?.startsWith('libsql:') || databaseUrl?.startsWith('http')) {
    const adapter = new PrismaLibSql({
      url: databaseUrl,
      authToken: authToken ?? undefined,
    })
    return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
  }

  // Fallback: local SQLite file (offline dev / tests).
  return new PrismaClient({ log })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
