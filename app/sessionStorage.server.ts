import type { PrismaClient } from "@prisma/client";
import type { Session } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

type RefreshableSession = Session & {
  refreshToken?: string;
  refreshTokenExpires?: Date;
};

/**
 * Prisma session storage that also keeps the refresh token.
 *
 * With `future.expiringOfflineAccessTokens` Shopify issues offline tokens
 * that expire after an hour plus a refresh token. The library refreshes a
 * stale token on its own (`ensureOfflineTokenIsNotExpired`), but only when
 * the stored session carries `refreshToken`, and the stock storage drops
 * that field. Without it, `unauthenticated.admin(shop)` and webhooks for a
 * shop whose merchant has not opened the app for an hour run on a dead
 * token (401), which is how a paid subscription went unrecorded.
 */
export class RefreshingPrismaSessionStorage extends PrismaSessionStorage<PrismaClient> {
  constructor(private readonly db: PrismaClient) {
    super(db);
  }

  async storeSession(session: Session): Promise<boolean> {
    const stored = await super.storeSession(session);
    const { refreshToken, refreshTokenExpires } = session as RefreshableSession;
    if (stored && refreshToken) {
      await this.db.session.update({
        where: { id: session.id },
        data: { refreshToken, refreshTokenExpires: refreshTokenExpires ?? null },
      });
    }
    return stored;
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const session = await super.loadSession(id);
    if (!session) return undefined;
    const row = await this.db.session.findUnique({
      where: { id },
      select: { refreshToken: true, refreshTokenExpires: true },
    });
    if (row?.refreshToken) {
      const refreshable = session as RefreshableSession;
      refreshable.refreshToken = row.refreshToken;
      refreshable.refreshTokenExpires = row.refreshTokenExpires ?? undefined;
    }
    return session;
  }
}
