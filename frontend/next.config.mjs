/** @type {import('next').NextConfig} */

// Cabeceras de seguridad base para todas las respuestas.
// La CSP arranca en Report-Only para no romper funcionalidad al aplicarla;
// una vez validada en producción, cambiar a Content-Security-Policy.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      // Next.js inline scripts/styles requieren 'unsafe-inline'; el nonce
      // estricto puede adoptarse después con middleware de CSP.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com http://localhost:* http://127.0.0.1:*",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  poweredByHeader: false,
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
