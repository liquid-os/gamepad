/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Fixes npm packages that depend on `fs` module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  // Allow serving static files from games folder
  async rewrites() {
    return [
      {
        source: '/games/:path*',
        destination: '/api/games/static/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

