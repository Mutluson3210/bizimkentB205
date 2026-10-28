// Doğrulama scriptleri Next.js'in bundler alias'ı olmadan düz Node altında
// çalıştığı için "server-only" paketi (bilerek) her zaman throw eder.
// Bu, sadece script çalıştırmaları için o paketi zararsız bir no-op ile
// değiştirir; uygulamanın kendisi (Next build/dev) bu dosyayı hiç görmez.
const Module = require("module");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === "server-only") {
    return require.resolve("./_empty.cjs");
  }
  return originalResolve.call(this, request, ...args);
};
