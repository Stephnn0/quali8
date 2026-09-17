-- Data migration: the free-tier flags were added with DEFAULT false and
-- production never runs `prisma db seed` (the image prunes tsx), so every
-- plan row — Advance included — read as "no zones / no announcements / no
-- popup" and the Delivery page gated everyone out. Mirror the seed
-- (prisma/seed/plans.ts, app/constants/plans.ts) for the existing rows.

UPDATE "RecurringPlan"
SET "hasAnnouncements" = true,
    "hasDeliveryZones" = true,
    "hasSubscribePopup" = true;

-- Free is limited, not locked: one bundle and 200 popup signups per month.
UPDATE "RecurringPlan"
SET "bundleLimit" = 1,
    "popupSignupLimit" = 200
WHERE "level" = 'FREE';

-- Paid tiers (Advance and the legacy Pro rows) are unlimited.
UPDATE "RecurringPlan"
SET "bundleLimit" = NULL,
    "popupSignupLimit" = NULL
WHERE "level" <> 'FREE';
