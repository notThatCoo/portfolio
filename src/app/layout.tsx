import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { site } from "@/config/site";
import { contentIndex, notes, projects } from "@/content";
import { themeInitScript } from "@/lib/theme";
import { Desktop } from "@/shell/Desktop";
import type { Bodies } from "@/shell/DesktopContext";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} · ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  authors: [{ name: site.name, url: site.github }],
  openGraph: { type: "website", siteName: site.name, url: "/" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07090f" },
    { media: "(prefers-color-scheme: light)", color: "#eef1f6" },
  ],
};

/**
 * Every MDX document is rendered here on the server and handed to the client
 * shell as ready-made React nodes. Windows can then switch documents
 * instantly, and none of the MDX toolchain ships to the browser.
 */
const bodies: Bodies = Object.fromEntries([
  ...notes.map(({ meta, Body }) => [`notes/${meta.slug}`, <Body key={meta.slug} />]),
  ...projects.map(({ meta, Body }) => [`projects/${meta.slug}`, <Body key={meta.slug} />]),
]);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Desktop content={contentIndex} bodies={bodies}>
          {children}
        </Desktop>
      </body>
    </html>
  );
}
