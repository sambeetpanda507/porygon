/**
 * Phase 7 — turning a scene into portable text, for both the .porygon
 * export file and the share-link query param. Plain base64 of the JSON
 * (via TextEncoder/TextDecoder, not btoa/atob directly, since labels
 * contain emoji outside the Latin1 range btoa alone can't handle) — no
 * compression library, no server: diagrams here are small enough that the
 * longer URL is an acceptable tradeoff for staying dependency-free.
 */
export function encodeSceneToBase64(scene: unknown): string {
  const json = JSON.stringify(scene);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function decodeBase64ToScene<T>(encoded: string): T {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as T;
}

export function buildShareUrl(scene: unknown): string {
  const encoded = encodeSceneToBase64(scene);
  const url = new URL(window.location.href);
  url.pathname = "/design";
  url.search = `?share=${encodeURIComponent(encoded)}`;
  return url.toString();
}
