import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Paquetes que corren solo en el servidor (no se bundlean para el cliente)
  serverExternalPackages: ['@prisma/client'],

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
