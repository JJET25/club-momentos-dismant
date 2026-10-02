import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { getBrand } from '@/lib/brand'
import { getRequestTenant } from '@/lib/tenant-server'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

// Cada portal se presenta solo con su marca (título de pestaña e ícono);
// el panel central y el dominio anterior usan "Club Momentos".
export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getRequestTenant()
  const brand = tenant.kind === 'brand' ? getBrand(tenant.affiliate) : null
  const name = brand?.name ?? 'Club Momentos'

  return {
    title: {
      default: name,
      template: `%s | ${name}`,
    },
    description: 'Programa de lealtad exclusivo',
    ...(brand?.logo ? { icons: { icon: brand.logo } } : {}),
    robots: {
      index: false, // Portal privado — no indexar
      follow: false,
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
