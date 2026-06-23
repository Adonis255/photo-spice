import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow network access for local development
  allowedDevOrigins: ['192.168.1.66'],
  
  // Disable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig