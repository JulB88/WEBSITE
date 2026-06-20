'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

interface FooterProps {
  logoUrl?: string
  nameShort?: string
  nameLegal?: string
}

export default function Footer({ logoUrl = '/dsf-logo.png', nameShort = 'DSF', nameLegal = 'Distribution Ste-Foy Ltée' }: FooterProps) {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer style={{ backgroundColor: 'var(--brand-dark)', color: '#9ca3af' }}>
      <div style={{ height: '6px', backgroundColor: 'var(--brand-primary)' }} />
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <Image src={logoUrl} alt={nameShort} width={110} height={38} style={{ objectFit: 'contain' }} />
            </div>
            <p className="text-sm" style={{ fontWeight: 300 }}>
              {t('home_hero_sub').split('—')[0].trim()}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
              {t('footer_nav')}
            </h4>
            <ul className="space-y-2 text-sm" style={{ fontWeight: 300 }}>
              <li><Link href="/products" style={{ color: '#9ca3af', textDecoration: 'none' }} className="hover:text-white transition-colors">{t('footer_products')}</Link></li>
              <li><Link href="/account" style={{ color: '#9ca3af', textDecoration: 'none' }} className="hover:text-white transition-colors">{t('footer_account')}</Link></li>
              <li><Link href="/account/orders" style={{ color: '#9ca3af', textDecoration: 'none' }} className="hover:text-white transition-colors">{t('footer_orders')}</Link></li>
              <li><Link href="/conditions" style={{ color: '#9ca3af', textDecoration: 'none' }} className="hover:text-white transition-colors">{t('footer_conditions')}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: '#fff', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
              {t('footer_contact')}
            </h4>
            <p className="text-sm" style={{ fontWeight: 300 }}>support@dsf.example.com</p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2.5rem', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 300 }}>
          <p>© {year} {nameLegal}</p>
        </div>
      </div>
    </footer>
  )
}
