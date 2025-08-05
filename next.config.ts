import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Configuración optimizada para procesamiento híbrido (backend + local) */
  
  // Variables de entorno
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
    NEXT_PUBLIC_USE_BACKEND: process.env.NEXT_PUBLIC_USE_BACKEND || 'true',
    NEXT_PUBLIC_BACKEND_TIMEOUT: process.env.NEXT_PUBLIC_BACKEND_TIMEOUT || '120000'
  },
  
  // Headers necesarios para SharedArrayBuffer y FFmpeg.wasm (fallback local)
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

  // Optimización para WebAssembly (fallback local)
  webpack: (config, { isServer }) => {
    // Optimización para FFmpeg.wasm cuando se usa procesamiento local
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
