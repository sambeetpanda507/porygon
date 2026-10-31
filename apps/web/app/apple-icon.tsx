import { ImageResponse } from "next/og";

// Same mark as app/icon.tsx, at the size iOS expects for a home-screen
// icon — Apple ignores rounding on the image itself and applies its own
// corner mask, so this one is a plain filled square.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon(): ImageResponse {
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
          color: "white",
          fontSize: 110,
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
