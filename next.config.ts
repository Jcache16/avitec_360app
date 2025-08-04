import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Configuración optimizada para FFmpeg.wasm en Next.js */
  
  // Headers necesarios para SharedArrayBuffer y FFmpeg.wasm
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },

  // Optimización para WebAssembly
  webpack: (config, { isServer }) => {
    // Optimización para FFmpeg.wasm
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    return config;
  },
};

export default nextConfig;
