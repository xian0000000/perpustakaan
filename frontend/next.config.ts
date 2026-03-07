/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",  // ← di level atas
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://backend:8080/:path*",  // ganti localhost → backend
      },
    ];
  },
};

export default nextConfig;