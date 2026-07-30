import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Consente l'accesso al dev server (HMR, source maps, ecc.) da altri host,
  // necessario quando si apre l'app da un IP/dominio diverso da localhost.
  allowedDevOrigins: ["72.61.23.233"],
};

export default nextConfig;
