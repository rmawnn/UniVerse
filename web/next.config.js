/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only output what's needed for production (smaller Docker images)
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
  // Image optimization — allow Supabase storage domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "media.giphy.com",
      },
      {
        protocol: "https",
        hostname: "media*.giphy.com",
      },
    ],
  },
};
module.exports = nextConfig;
