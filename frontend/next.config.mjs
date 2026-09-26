/** @type {import('next').NextConfig} */

// Cabeceras de seguridad base para todas las respuestas.
// CSP activa (no Report-Only): permite el propio origen, Supabase (API,
// realtime wss y storage vía https), Google Fonts, Gemini y los scripts de
// Vercel Analytics. Los inline de Next requieren 'unsafe-inline'/'unsafe-eval'
// en dev; endurecer con nonces queda como paso posterior.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inline scripts/styles requieren 'unsafe-inline'; el nonce
      // estricto puede adoptarse después con middleware de CSP.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://va.vercel-scripts.com https://vitals.vercel-insights.com http://localhost:* http://127.0.0.1:* https://api.leaduni.org https://univia-backend.onrender.com",      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  poweredByHeader: false,
  // Salida standalone para el Dockerfile multi-stage: next build genera
  // .next/standalone con un server.js autocontenido (sin node_modules
  // completo), lo que reduce la imagen final y acelera el arranque.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      // Miniaturas de previsualización de los recursos alojados en Drive.
      { protocol: "https", hostname: "drive.google.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  turbopack: {},
  webpack: (config) => {
    config.ignoreWarnings = [/Invalid source map/];
    return config;
  },
}

export default nextConfig
