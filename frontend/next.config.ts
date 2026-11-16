import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  async rewrites() {
    const backendUrl = (
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000"
    ).replace(/\/$/, "");

    return [
      {
        source: "/api/dossiers/:path*",
        destination: `${backendUrl}/api/dossiers/:path*`,
      },
      {
        source: "/api/documents/:path*",
        destination: `${backendUrl}/api/documents/:path*`,
      },
    ];
  },
};

export default nextConfig;
