/**
 * Cloudflare Worker — static asset passthrough with cross-origin isolation headers.
 *
 * expo-sqlite on web uses a WASM build that requires SharedArrayBuffer, which browsers
 * only expose on cross-origin isolated pages. The two headers below enable isolation:
 *   COOP  — prevents other origins from keeping a reference to this window
 *   COEP  — blocks sub-resources that don't opt in to being embedded cross-origin
 *
 * Without these headers the SQLite WASM fails to initialize, so all DB operations
 * silently do nothing and the app is permanently stuck on the login screen.
 */
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const modified = new Response(response.body, response);
    modified.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    modified.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    return modified;
  },
};
