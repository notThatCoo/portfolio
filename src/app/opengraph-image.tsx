import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview card, generated at build time (no image asset to maintain). */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: 80,
        color: "#e9edf5",
        background:
          "radial-gradient(60% 60% at 15% 20%, rgba(46,201,140,.45), transparent 70%), radial-gradient(55% 55% at 85% 15%, rgba(99,102,241,.5), transparent 70%), radial-gradient(70% 60% at 65% 100%, rgba(236,72,153,.35), transparent 70%), #0a0c18",
      }}
    >
      <div style={{ fontSize: 30, color: "#4ee0a6", letterSpacing: 2 }}>
        {site.tagline.toUpperCase()}
      </div>
      <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -3, marginTop: 8 }}>
        {site.name}
      </div>
      <div style={{ fontSize: 34, color: "#9aa3b5", marginTop: 16 }}>
        B.S. Data Science, UC Riverside · a portfolio you can click around in
      </div>
    </div>,
    size,
  );
}
