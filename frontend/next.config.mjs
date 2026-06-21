/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.ignoreWarnings = [/Invalid source map/];
    return config;
  },
  turbopack: {},
}

export default nextConfig