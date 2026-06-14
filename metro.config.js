// Metro config. Extends Expo's defaults and adds the support expo-sqlite needs on
// web: resolve the wa-sqlite `.wasm` asset, and serve the cross-origin isolation
// headers required for the SQLite Web Worker (SharedArrayBuffer / OPFS).
// See: https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  return middleware(req, res, next);
};

module.exports = config;
