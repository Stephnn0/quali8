/**
 * The cart block's Options step: which fields it shows. Pure — shared by
 * the admin card, the storefront payload, and tests.
 */

export type CartOptions = {
  /** Show the Options step at all; off = the cart goes from Delivery straight to Review. */
  enabled: boolean;
  occasionEnabled: boolean;
  cardMessageEnabled: boolean;
  notesEnabled: boolean;
  /** Label of the notes field, e.g. "Notes for us" or "Delivery instructions". */
  notesLabel: string;
  /** "If nobody answers the door" dropdown: leave it / don't leave it. */
  doorEnabled: boolean;
};

export const MAX_NOTES_LABEL = 60;
export const DEFAULT_NOTES_LABEL = "Notes for us";

export const defaultCartOptions = (): CartOptions => ({
  enabled: true,
  occasionEnabled: true,
  cardMessageEnabled: true,
  notesEnabled: true,
  notesLabel: DEFAULT_NOTES_LABEL,
  doorEnabled: true,
});

/** Clamp untrusted input into CartOptions; a blank label falls back to the default. */
export function sanitizeCartOptions(input: Partial<CartOptions> | null | undefined): CartOptions {
  const base = defaultCartOptions();
  if (!input) return base;
  const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
  const label = String(input.notesLabel ?? "").trim().slice(0, MAX_NOTES_LABEL);
  return {
    enabled: flag(input.enabled, base.enabled),
    occasionEnabled: flag(input.occasionEnabled, base.occasionEnabled),
    cardMessageEnabled: flag(input.cardMessageEnabled, base.cardMessageEnabled),
    notesEnabled: flag(input.notesEnabled, base.notesEnabled),
    notesLabel: label || base.notesLabel,
    doorEnabled: flag(input.doorEnabled, base.doorEnabled),
  };
}
