import type { NextConfig } from "next";

// [B21] CSP 및 보안 헤더 추가
// nonce 없이 next.config.ts headers()에서 정적으로 설정하는 방식 사용
// (공식 docs/content-security-policy.md "Without Nonces" 섹션 참고)
const isDev = process.env.NODE_ENV === 'development';

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  img-src 'self' blob: data: https://*.supabase.co;
  font-src 'self' https://cdn.jsdelivr.net;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`;

const nextConfig: NextConfig = {
  // Lets the dev server (HMR websocket + /_next/* assets) work when the app is
  // reached through a temporary Cloudflare Tunnel instead of localhost — Next's
  // dev-only cross-origin guard otherwise 403s the HMR socket from any other
  // host, which blocks hydration entirely (page renders, nothing is clickable).
  allowedDevOrigins: ["*.trycloudflare.com"],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, '').replace(/\s{2,}/g, ' ').trim(),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
