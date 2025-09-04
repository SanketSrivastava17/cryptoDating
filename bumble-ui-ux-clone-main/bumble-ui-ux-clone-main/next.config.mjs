/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Handle API routes in serverless environment
  experimental: {
    serverComponentsExternalPackages: ['fs'],
  },
}

export default nextConfig