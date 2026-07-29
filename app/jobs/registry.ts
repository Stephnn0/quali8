import type { Job } from "./runner.server";
import { menuSyncJob } from "./menuSync.server";

/**
 * Every background job the Cloud Scheduler heartbeat can trigger.
 * Adding a scheduled feature = write an idempotent job and list it here —
 * no GCP changes. Jobs MUST reconcile state (safe to rerun), never
 * "do the thing once".
 */
export const JOBS: Job[] = [menuSyncJob];
