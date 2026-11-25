import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Aktarıcı Next uygulamasının parçası değil: ayrı bir makinede düz Node
    // (CommonJS) olarak çalışıyor, bu yapılandırmanın TypeScript/React
    // kurallarına tabi değil. Bkz. sms-relay/README.md
    "sms-relay/**",
  ]),
]);

export default eslintConfig;
