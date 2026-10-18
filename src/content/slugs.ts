/**
 * Every document slug, as plain data with no MDX imports, so lightweight
 * code (the request Proxy) can validate URLs. `index.ts` types its MDX
 * registry against these lists, so the two can't drift: a missing or extra
 * entry is a type error.
 */
export const NOTE_SLUGS = ["about-me", "resume"] as const;

export const PROJECT_SLUGS = [
  "darkside-20k-surrogate",
  "streamline-etl",
  "robot-fleet-sensor-insights",
  "crypto-signal-bot",
  "real-estate-lead-engine",
  "mobilenetv2-image-classifier",
] as const;

export type NoteSlug = (typeof NOTE_SLUGS)[number];
export type ProjectSlug = (typeof PROJECT_SLUGS)[number];
