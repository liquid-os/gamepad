/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SEO optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
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
  // Headers for better SEO and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

