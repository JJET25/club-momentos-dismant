import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Paquetes que corren solo en el servidor y NO deben bundlearse por webpack.
  // @prisma/client — requiere binarios nativos.
  // @react-pdf/renderer — inicializa su propio fiber renderer; si webpack lo bundlea
  //   junto al web renderer de React, causa errores durante SSG.
  // resend — incluye @react-email/render, que trae React 18 propio.  Como resend
  //   solo se usa en API routes (nunca en páginas/layouts), dejarlo externo es seguro
  //   y evita que React 18 de resend entre en el bundle del servidor de Next.js.
  serverExternalPackages: ['@prisma/client', '@react-pdf/renderer', 'resend'],

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
