import type { PrismaClient } from "@prisma/client";

export type Job = {
  /** Unique, stable — also the JobRun row key. */
  name: string;
  /** Minimum minutes between successful runs. */
  everyMinutes: number;
  run: (db: PrismaClient) => Promise<string | void>;
};

export type JobResult = {
  name: string;
  status: "ran" | "skipped" | "failed";
  detail: string | null;
};

/** A claim older than this is considered stuck (crashed instance) and stealable. */
const STALE_LOCK_MINUTES = 10;

/**
 * Runs every due job exactly once across all app instances.
 *
 * Claiming is an atomic conditional update on the JobRun row, so concurrent
 * ticks (Cloud Scheduler retries, multiple Cloud Run instances) can't
 * double-run a job: only the instance whose UPDATE matched proceeds. Jobs
 * must be idempotent state-reconcilers regardless — the lock is an
 * optimization, not the correctness boundary.
 */
export async function runDueJobs(
  db: PrismaClient,
  jobs: Job[],
  now: Date = new Date(),
): Promise<JobResult[]> {
  const results: JobResult[] = [];

  for (const job of jobs) {
    // Ensure the row exists (first ever run)
    await db.jobRun.upsert({
      where: { name: job.name },
      create: { name: job.name },
      update: {},
    });

    const staleBefore = new Date(now.getTime() - STALE_LOCK_MINUTES * 60_000);
    const dueBefore = new Date(now.getTime() - job.everyMinutes * 60_000);

    // Atomic claim: not locked (or lock is stale) AND due (or never ran)
    const claimed = await db.jobRun.updateMany({
      where: {
        name: job.name,
        OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }],
        AND: [
          {
            OR: [
              { lastSuccessAt: null },
              { lastSuccessAt: { lt: dueBefore } },
            ],
          },
        ],
      },
      data: { lockedAt: now },
    });
    if (claimed.count === 0) {
      results.push({ name: job.name, status: "skipped", detail: null });
      continue;
    }

    try {
      const detail = await job.run(db);
      await db.jobRun.update({
        where: { name: job.name },
        data: { lockedAt: null, lastSuccessAt: new Date(), lastError: null },
      });
      results.push({ name: job.name, status: "ran", detail: detail ?? null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Job ${job.name} failed:`, error);
      await db.jobRun
        .update({
          where: { name: job.name },
          data: { lockedAt: null, lastError: message.slice(0, 1000) },
        })
        .catch(() => {});
      results.push({ name: job.name, status: "failed", detail: message });
    }
  }

  return results;
}

/** Today's ISO date (yyyy-mm-dd) in a shop's timezone; UTC when unknown. */
export function todayInTimeZone(timeZone: string | null | undefined): string {
  try {
    // en-CA formats as yyyy-mm-dd
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
