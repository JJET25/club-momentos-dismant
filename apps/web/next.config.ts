import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Paquetes que corren solo en el servidor (no se bundlean para el cliente)
  // @react-pdf/renderer must stay external — its module-level fiber renderer init
  // conflicts with Next.js's web React renderer during static page generation
  serverExternalPackages: ['@prisma/client', '@react-pdf/renderer'],

  // Force all packages to use the same React 19 instance.
  // Without this, root node_modules/react@18 coexists with apps/web's React 19
  // and causes "Objects are not valid as a React child" (error #31) during SSG.
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      react:     path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }
    return config
  },

  // Imágenes: dominios permitidos para next/image
  images: {
    remotePatterns: [
      {
        // Cloudflare R2 bucket público
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        // Supabase Storage (si se usa)
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Redirigir la raíz al login
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
