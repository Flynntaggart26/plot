// Metro yapılandırması.
//
// İki ek:
// 1. `.sql` dosyaları kaynak olarak paketlenir; Drizzle migration'ları
//    babel-plugin-inline-import ile string'e gömülür.
// 2. Web'de expo-sqlite (wa-sqlite) SharedArrayBuffer kullanır. Dev sunucusu
//    COEP/COOP başlıklarını göndermezse tarayıcı SQLite'ı çalıştırmaz.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
config.resolver.sourceExts.push('sql');

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
