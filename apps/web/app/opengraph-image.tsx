import { ImageResponse } from "next/og";

// Social share card shown on LinkedIn/X/Slack previews. Same gradient and
// glyph as app/icon.tsx so the brand mark is consistent everywhere.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "linear-gradient(135deg, #0F1222, #1B1E3A)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "linear-gradient(135deg, #7C6CF0, #4D7CFE)",
              color: "white",
              fontSize: 44,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, color: "white" }}>
            P0rygon
          </div>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.15,
            maxWidth: 920,
          }}
        >
          Design systems on a whiteboard. Then watch them break.
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 28,
            color: "#B9BEE8",
          }}
        >
          Draw an architecture, simulate traffic, inject failures.
        </div>
      </div>
    ),
    size,
  );
}
