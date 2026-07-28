/**
 * Deterministic commerce dates per country and year — the ground truth the
 * AI builds on. LLMs get movable holidays wrong (Mother's Day varies by
 * country, Easter moves yearly), so these are computed, given to Gemini in
 * the prompt, and never left to the model. Client-safe, fully unit tested.
 */

export type CoreDate = {
  name: string;
  /** ISO yyyy-mm-dd */
  date: string;
};

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** Anonymous Gregorian algorithm (Meeus/Jones/Butcher). */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** nth (1-based) weekday (0=Sun) of a month, UTC. */
function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  nth: number,
): number {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((7 + weekday - first) % 7) + (nth - 1) * 7;
}

function lastWeekday(year: number, month: number, weekday: number): number {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = new Date(Date.UTC(year, month - 1, daysInMonth)).getUTCDay();
  return daysInMonth - ((7 + last - weekday) % 7);
}

function addDays(year: number, month: number, day: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function mothersDay(year: number, country: string): CoreDate {
  const code = country.toUpperCase();
  if (code === "GB" || code === "IE" || code === "UNITED KINGDOM") {
    // Mothering Sunday: 3 weeks before Easter Sunday
    const easter = easterSunday(year);
    const d = addDays(year, easter.month, easter.day, -21);
    return { name: "Mother's Day", date: iso(d.year, d.month, d.day) };
  }
  if (code === "MX" || code === "MEXICO") {
    return { name: "Mother's Day", date: iso(year, 5, 10) };
  }
  if (code === "FR" || code === "FRANCE") {
    return {
      name: "Mother's Day",
      date: iso(year, 5, lastWeekday(year, 5, 0)),
    };
  }
  if (code === "ES" || code === "SPAIN" || code === "PT" || code === "PORTUGAL") {
    return { name: "Mother's Day", date: iso(year, 5, nthWeekday(year, 5, 0, 1)) };
  }
  // US, CA, AU, DE, and most others: second Sunday of May
  return { name: "Mother's Day", date: iso(year, 5, nthWeekday(year, 5, 0, 2)) };
}

/** All core commerce dates for a calendar year. */
export function coreDatesForYear(year: number, country: string): CoreDate[] {
  const easter = easterSunday(year);
  const thanksgivingDay = nthWeekday(year, 11, 4, 4); // 4th Thursday of Nov
  const blackFriday = addDays(year, 11, thanksgivingDay, 1);
  const cyberMonday = addDays(year, 11, thanksgivingDay, 4);

  const dates: CoreDate[] = [
    { name: "New Year's Day", date: iso(year, 1, 1) },
    { name: "Valentine's Day", date: iso(year, 2, 14) },
    { name: "International Women's Day", date: iso(year, 3, 8) },
    { name: "Easter", date: iso(year, easter.month, easter.day) },
    mothersDay(year, country),
    { name: "Father's Day", date: iso(year, 6, nthWeekday(year, 6, 0, 3)) },
    { name: "Halloween", date: iso(year, 10, 31) },
    {
      name: "Black Friday",
      date: iso(blackFriday.year, blackFriday.month, blackFriday.day),
    },
    {
      name: "Cyber Monday",
      date: iso(cyberMonday.year, cyberMonday.month, cyberMonday.day),
    },
    { name: "Christmas", date: iso(year, 12, 25) },
    { name: "New Year's Eve", date: iso(year, 12, 31) },
  ];

  if (["US", "UNITED STATES"].includes(country.toUpperCase())) {
    dates.push({
      name: "Thanksgiving",
      date: iso(year, 11, thanksgivingDay),
    });
    dates.push({ name: "Independence Day", date: iso(year, 7, 4) });
  }

  return dates;
}

/** Core dates within the next `windowDays` from `from` (inclusive). */
export function upcomingCoreDates(
  from: Date,
  country: string,
  windowDays = 90,
): CoreDate[] {
  const start = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const end = start + windowDays * 24 * 60 * 60 * 1000;

  const years = [from.getUTCFullYear(), from.getUTCFullYear() + 1];
  const all = years.flatMap((year) => coreDatesForYear(year, country));

  return all
    .filter((core) => {
      const time = Date.parse(core.date + "T00:00:00Z");
      return time >= start && time <= end;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
