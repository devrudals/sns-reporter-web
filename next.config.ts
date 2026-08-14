import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server (HMR websocket + /_next/* assets) work when the app is
  // reached through a temporary Cloudflare Tunnel instead of localhost — Next's
  // dev-only cross-origin guard otherwise 403s the HMR socket from any other
  // host, which blocks hydration entirely (page renders, nothing is clickable).
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
