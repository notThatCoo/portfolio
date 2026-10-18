/**
 * Site-wide facts. Anything set to `null` is hidden in the UI rather than
 * rendered as a broken link, so it is safe to ship before it's filled in.
 */
export const site = {
  name: "Tolu Adeleye",
  shortName: "Tolu",
  tagline: "Data science · ML · data engineering",
  description:
    "Tolu Adeleye — B.S. Data Science, UC Riverside (2026). Projects in machine learning, physics surrogates, and data engineering, presented as a desktop in your browser.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://tolu-adeleye.vercel.app",
  github: "https://github.com/notThatCoo",
  githubHandle: "notThatCoo",
  repo: "https://github.com/notThatCoo/portfolio",
  /** Path under /public, e.g. "/resume.pdf". */
  resumePdf: null as string | null,
  email: null as string | null,
  linkedin: null as string | null,
  playlist: {
    title: "Afrobeats Rotation",
    spotify: null as string | null,
    appleMusic: null as string | null,
    youtube: null as string | null,
  },
} as const;
