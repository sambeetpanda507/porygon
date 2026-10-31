import type { ReactNode } from "react";
import Link from "next/link";

export default function HomePage(): ReactNode {
  return (
    <main className="landing-placeholder">
      <h1>Porygon</h1>
      <p>Design systems on a whiteboard. Then watch them break.</p>
      <Link href="/design">Open the whiteboard</Link>
    </main>
  );
}
