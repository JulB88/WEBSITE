import { redirect } from 'next/navigation'

/**
 * /admin/settings → redirigé vers /dashboard/settings (page unifiée)
 */
export default function AdminSettingsRedirect() {
  redirect('/dashboard/settings')
}
