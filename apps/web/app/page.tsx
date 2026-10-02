import { Suspense } from 'react'
import { Sora, Plus_Jakarta_Sans } from 'next/font/google'
import { FileText, Truck, Tag } from 'lucide-react'
import { HUB_BRAND, getBrandCssVars } from '@/lib/brand'
import { LoginForm } from './(auth)/login/login-form'
import {
  FlowIllustration, BalanceIllustration, StatementIllustration, CatalogIllustration,
} from '@/components/home/illustrations'

// Página de inicio del dominio de entrada (clubmomentos.<dominio>). Solo se
// sirve ahí: en los portales y el panel el middleware manda "/" al login.

const sora    = Sora({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-sora' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-jakarta' })

const CONTACT_EMAIL = 'jespinoza@silauti.com.mx'

const AFFILIATES = [
  { name: 'Dismant', href: 'https://dismant.com.mx/',    label: 'dismant.com.mx',    logo: '/brand/dismant.png', logoClass: 'h-8' },
  { name: 'Lauti',   href: 'https://www.silauti.com.mx/', label: 'www.silauti.com.mx', logo: '/brand/lauti.png',   logoClass: 'h-9' },
]

const FEATURES = [
  { title: 'Inicio',           body: 'Tu saldo, lo ganado este mes y tus últimos movimientos.', Illustration: BalanceIllustration },
  { title: 'Estado de cuenta', body: 'Cada punto con su origen, en gráfica y en PDF.',          Illustration: StatementIllustration },
  { title: 'Catálogo',         body: 'Premios para tu estado y ciudad, digitales o con envío.',  Illustration: CatalogIllustration },
]

const MORE = [
  { title: 'Mis facturas.', body: 'El estado de cada factura y los puntos que generó.', Icon: FileText },
  { title: 'Mis canjes.',   body: 'Tus premios, códigos y seguimiento de envíos.',      Icon: Truck },
  { title: 'Promociones.',  body: 'Ofertas de aliados disponibles para tu zona.',       Icon: Tag },
]

const STEPS = [
  { title: 'Abre tu invitación', body: 'Llega a tu correo de parte de tu ejecutivo de cuenta.' },
  { title: 'Crea tu cuenta',     body: 'Confirma tu correo con un código y completa tus datos.' },
  { title: 'Inicia sesión',      body: 'Entras directo a la aplicación.' },
]

const heading = 'font-[family-name:var(--font-sora)] font-bold tracking-tight'

export default function HomePage() {
  return (
    <div
      className={`${sora.variable} ${jakarta.variable} font-[family-name:var(--font-jakarta)] min-h-screen bg-[#F4F5FA] text-slate-900`}
      style={getBrandCssVars(HUB_BRAND) as React.CSSProperties}
    >
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center gap-7">
          <span className="flex items-center gap-2.5 flex-1">
            <span className={`w-9 h-9 rounded-[10px] bg-indigo-700 text-white flex items-center justify-center text-sm ${heading}`}>CM</span>
            <span className={`text-xl ${heading}`}>Club Momentos</span>
          </span>
          <nav aria-label="Secciones" className="hidden md:flex gap-7 text-[15px] font-semibold text-slate-700">
            <a href="#dentro" className="hover:text-indigo-700">Qué encontrarás</a>
            <a href="#empezar" className="hover:text-indigo-700">Cómo empezar</a>
            <a href="#afiliadas" className="hover:text-indigo-700">Empresas afiliadas</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-12 lg:pt-16 pb-16 lg:pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 flex flex-col gap-5">
            <span className="self-start text-[13px] font-bold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-full">Acceso solo para invitados</span>
            <h1 className={`text-4xl sm:text-5xl lg:text-[56px] leading-[1.06] ${heading}`}>Bienvenido a tu programa de lealtad.</h1>
            <p className="text-lg leading-relaxed text-slate-600 max-w-xl">
              Consulta tu saldo, revisa tus facturas y canjea premios. Inicia sesión con el correo de tu invitación y entrarás directo a la aplicación.
            </p>
            <div className="pt-2 hidden sm:block"><FlowIllustration /></div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-[20px] p-7 sm:p-9 shadow-[0_24px_48px_-28px_rgba(67,56,202,0.35)]">
            <Suspense fallback={<div className="h-64 rounded-lg bg-slate-50 animate-pulse" aria-busy="true" />}>
              <LoginForm />
            </Suspense>
          </div>
        </section>

        <section id="dentro" className="max-w-6xl mx-auto px-4 sm:px-8 pb-20 flex flex-col gap-7 scroll-mt-6">
          <h2 className={`text-3xl sm:text-[38px] ${heading}`}>Qué encontrarás dentro</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ title, body, Illustration }) => (
              <article key={title} className="bg-white border border-slate-200 rounded-[20px] p-7 flex flex-col gap-3.5">
                <Illustration />
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-base leading-relaxed text-slate-600">{body}</p>
              </article>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {MORE.map(({ title, body, Icon }) => (
              <div key={title} className="flex gap-3.5 items-start p-1">
                <Icon className="w-6 h-6 shrink-0 text-indigo-700" aria-hidden="true" />
                <p className="text-[15px] leading-relaxed text-slate-600"><strong className="text-slate-900">{title}</strong> {body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="empezar" className="bg-white border-y border-slate-200 scroll-mt-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-20 flex flex-col gap-9">
            <h2 className={`text-3xl sm:text-[38px] ${heading}`}>Cómo empezar</h2>
            <ol className="grid md:grid-cols-3 gap-6">
              {STEPS.map(({ title, body }, i) => (
                <li key={title} className="bg-[#F4F5FA] rounded-[18px] p-7 flex flex-col gap-2.5">
                  <span className={`w-10 h-10 rounded-full bg-indigo-700 text-white flex items-center justify-center ${heading}`}>{i + 1}</span>
                  <span className="mt-1.5 text-xl font-bold">{title}</span>
                  <span className="text-base leading-relaxed text-slate-600">{body}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="afiliadas" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 flex flex-col items-center gap-7 text-center scroll-mt-6">
          <h2 className={`text-2xl sm:text-[28px] ${heading}`}>Empresas afiliadas</h2>
          <div className="flex gap-6 flex-wrap justify-center">
            {AFFILIATES.map(a => (
              <a
                key={a.name}
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${a.name} (abre su sitio en otra pestaña)`}
                className="bg-white border border-slate-200 rounded-2xl px-9 py-6 flex flex-col items-center gap-3 min-w-[240px] hover:border-indigo-300 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.logo} alt={a.name} className={`${a.logoClass} w-auto`} />
                <span className="text-sm font-semibold text-indigo-700">{a.label} ↗</span>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-7 flex gap-6 flex-wrap text-sm text-slate-600">
          <span className="flex-1">© {new Date().getFullYear()} Club Momentos · Acceso por invitación</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-700 hover:underline">{CONTACT_EMAIL}</a>
        </div>
      </footer>
    </div>
  )
}
