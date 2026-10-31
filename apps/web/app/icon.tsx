import { ImageResponse } from "next/og";

// Matches the logo badge on the landing page (app/landing.css
// .landing-logo-badge) — same gradient, same rounding, same glyph — so the
// browser tab icon and the in-page logo are visibly the same mark.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7C6CF0, #4D7CFE)",
          borderRadius: 7,
          color: "white",
          fontSize: 20,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        P
      </div>
    ),
    size,
  );
}
