import type { ActionFunctionArgs } from "react-router";
import db from "app/db.server";
import { JOBS } from "app/jobs/registry";
import { runDueJobs } from "app/jobs/runner.server";

/**
 * The Cloud Scheduler heartbeat: POST /jobs/tick every 15 minutes with the
 * shared secret header. Fans out to every due registered job (app/jobs/)
 * with atomic claiming, so retries and concurrent instances are safe.
 *
 * Setup (see PR notes): one Cloud Scheduler HTTP job on a 15-minute
 * schedule posting here with the x-cron-secret header.
 */
export async function action({ request }: ActionFunctionArgs) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }
  if (request.headers.get("x-cron-secret") !== secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await runDueJobs(db, JOBS);
  const failed = results.some((result) => result.status === "failed");
  return Response.json({ results }, { status: failed ? 500 : 200 });
}

/** GETs (health checks, curious browsers) reveal nothing. */
export async function loader() {
  return Response.json({ error: "POST only" }, { status: 405 });
}
