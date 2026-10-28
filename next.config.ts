import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* Bu uygulamadaki her sayfa oturuma (cookie) bağlı ve dinamik render edilir;
     statik/cache optimizasyonuna uygun değil, bu yüzden kapalı. */
  turbopack: {
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
