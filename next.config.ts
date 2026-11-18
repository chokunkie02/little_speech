import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Dev server only: let pages opened at http://127.0.0.1:3000 load their scripts and hot reload.
  // Without this Next blocks them as cross-origin and client-rendered parts stay on their skeletons.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
