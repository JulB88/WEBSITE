# DSF — Distribution Ste-Foy

Plateforme e-commerce B2B/B2C connectée à Microsoft Business Central.

---

## 🔐 Accès au site (pré-lancement)

Le site est protégé par un mot de passe durant le développement.

| Champ | Valeur |
|-------|--------|
| URL | https://shopbc.vercel.app |
| Mot de passe d'accès | `QWEasdZXC1!` |

> Le mot de passe peut être changé depuis **Dashboard → Settings → Accès au site**, ou désactivé complètement pour mettre le site en public.

---

## 👤 Comptes créés

### Administrateur

| Champ | Valeur |
|-------|--------|
| Email | `jul.beaulieu88@gmail.com` |
| Mot de passe | `Admin1234!` |
| Rôle | Super Admin |
| Accès | Dashboard complet — `/dashboard` |

---

## 🛠️ Stack technique

- **Framework** — Next.js 16 (App Router)
- **Base de données** — PostgreSQL via Neon
- **ORM** — Prisma
- **Auth** — NextAuth.js v4
- **Paiement** — Stripe
- **ERP** — Microsoft Business Central
- **Déploiement** — Vercel

---

## 📁 Structure

```
src/
  app/
    (store)/        → Storefront public (Navbar + Footer)
    dashboard/      → Interface d'administration
    api/            → Routes API
  components/       → Composants réutilisables
  lib/              → Auth, Prisma, permissions, i18n
prisma/
  schema.prisma     → Modèle de données
  seed.ts           → Données initiales (76 produits, 8 catégories)
```
