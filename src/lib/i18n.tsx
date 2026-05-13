'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Lang = 'fr' | 'en'

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  fr: {
    // Navbar
    nav_home: 'Accueil',
    nav_products: 'Produits',
    nav_login: 'Connexion',
    nav_register: "S'inscrire",
    nav_account: 'Mon profil',
    nav_orders: 'Mes commandes',
    nav_logout: 'Déconnexion',
    nav_dashboard: 'Dashboard',

    // Home
    home_hero_title: 'Distribution professionnelle',
    home_hero_sub: 'Connecté à Microsoft Business Central — tarification personnalisée pour les clients B2B, inventaire en temps réel et commande simplifiée.',
    home_hero_cta: 'Nos produits',
    home_hero_cta2: 'Créer un compte entrepreneur',
    home_stats_skus: 'Références en catalogue',
    home_stats_delivery: 'Livraison rapide',
    home_stats_bc: 'Inventaire en temps réel',
    home_stats_b2b: 'Tarification entrepreneur',
    home_categories: 'Nos catégories',
    home_cat_all: 'Tous les produits',
    home_featured: 'Produits vedettes',
    home_featured_sub: 'Sélection de nos articles les plus populaires',
    home_b2b_title: 'Solutions Entrepreneur',
    home_b2b_sub: 'Tarification négociée, facturation centralisée, synchronisation BC en temps réel.',
    home_b2b_cta: 'Ouvrir un compte entrepreneur',

    // Products
    products_title: 'Produits',
    products_sub: 'Parcourez notre catalogue complet de produits',
    products_search: 'Rechercher des produits…',
    products_all_cats: 'Toutes les catégories',
    products_sort_newest: 'Plus récent',
    products_sort_price_asc: 'Prix croissant',
    products_sort_price_desc: 'Prix décroissant',
    products_sort_name: 'Alphabétique',
    products_loading: 'Chargement…',
    products_none: 'Aucun produit trouvé.',

    // Product card / detail
    in_stock: 'En stock',
    low_stock: 'Il reste {{n}} en stock',
    out_of_stock: 'Épuisé',
    add_to_cart: 'Ajouter au panier',
    added_to_cart: '✓ Ajouté !',
    proceed_checkout: 'Passer à la caisse →',
    item_no: 'Référence :',
    description: 'Description',
    quantity: 'Quantité :',
    b2b_savings: 'Tarification entrepreneur appliquée. Vous économisez {{n}} $ sur cet article.',

    // Breadcrumb
    breadcrumb_home: 'Accueil',
    breadcrumb_products: 'Produits',
    product_not_found: 'Produit introuvable',
    product_not_found_link: 'Retour aux produits',

    // Cart
    cart_title: 'Panier',
    cart_empty_title: 'Votre panier est vide',
    cart_empty_sub: "Vous n'avez pas encore ajouté de produits.",
    cart_browse: 'Parcourir les produits',
    cart_clear: 'Vider le panier',
    cart_product: 'Produit',
    cart_price: 'Prix',
    cart_qty: 'Qté',
    cart_subtotal: 'Sous-total',
    cart_remove: 'Supprimer',
    cart_summary: 'Résumé de la commande',
    cart_items: '{{n}} article(s)',
    cart_shipping: 'Livraison',
    cart_shipping_note: 'Calculée à la caisse',
    cart_total: 'Total',
    cart_checkout: 'Passer à la caisse',
    cart_continue: 'Continuer mes achats',

    // Account
    account_title: 'Mon compte',
    account_type: 'Type de compte',
    account_since: 'Membre depuis',
    account_orders_total: 'Commandes totales',
    account_orders_link: 'Voir toutes les commandes →',
    account_business: 'Compte entrepreneur',
    account_company: 'Entreprise',
    account_vat: 'TPS/TVQ',
    account_discount: 'Remise',
    account_pricelist: 'Liste de prix',
    account_recent_orders: 'Commandes récentes',
    account_view_all: 'Voir tout',
    account_no_orders: 'Aucune commande',
    account_start_shopping: 'Commencer mes achats',
    account_order_items: '{{n}} article(s)',

    // Auth
    login_title: 'Connexion',
    login_sub: 'Accédez à votre espace client DSF',
    login_email: 'Adresse courriel',
    login_password: 'Mot de passe',
    login_submit: 'Se connecter',
    login_submitting: 'Connexion…',
    login_no_account: 'Pas encore de compte ?',
    login_create: 'Créer un compte',

    register_title: 'Créer un compte',
    register_sub: 'Rejoignez DSF — Distribution professionnelle',
    register_account_type: 'Type de compte',
    register_personal: 'Personnel',
    register_business: 'Entrepreneur',
    register_name: 'Nom complet',
    register_email: 'Adresse courriel',
    register_password: 'Mot de passe',
    register_password_hint: 'Au moins 8 caractères',
    register_confirm: 'Confirmer le mot de passe',
    register_company: "Nom de l'entreprise",
    register_vat: 'Numéro de TPS/TVQ (optionnel)',
    register_customer_no: 'Numéro de client (optionnel)',
    register_customer_no_hint: 'Votre numéro de client DSF, si vous en avez un',
    register_no_customer_no: 'Je n\'ai pas de numéro de client',
    register_account_request_label: 'Dans ce cas, que souhaitez-vous faire ?',
    register_account_request_new: 'Faire une demande d\'ouverture de compte entrepreneur',
    register_account_request_existing: 'J\'ai déjà un compte mais je ne connais pas mon numéro',
    register_submit: 'Créer mon compte',
    register_submitting: 'Création en cours…',
    register_has_account: 'Déjà un compte ?',
    register_login: 'Se connecter',

    // Checkout
    checkout_title: 'Passer la commande',
    checkout_empty: 'Votre panier est vide.',
    checkout_browse: 'Voir les produits',
    checkout_billing: 'Informations de facturation',
    checkout_fullname: 'Nom complet',
    checkout_email: 'Adresse courriel',
    checkout_address: 'Adresse',
    checkout_city: 'Ville',
    checkout_postal: 'Code postal',
    checkout_country: 'Pays',
    checkout_payment: 'Paiement sécurisé',
    checkout_stripe_note: 'Paiement sécurisé par Stripe (PCI-DSS)',
    checkout_terms: "En passant la commande, vous acceptez nos",
    checkout_conditions: "conditions générales de vente",
    checkout_submit: 'Confirmer et payer',
    checkout_processing: 'Traitement…',
    checkout_order_summary: 'Résumé de la commande',

    // Footer
    footer_nav: 'Navigation',
    footer_products: 'Produits',
    footer_account: 'Mon compte',
    footer_orders: 'Mes commandes',
    footer_conditions: 'Conditions de vente',
    footer_contact: 'Contact',
    footer_copy: '© {{year}} Distribution Ste-Foy (DSF). Tous droits réservés.',

    // Status / badges
    status_active: 'Actif',
    status_inactive: 'Inactif',
    status_pending: 'En attente',
    status_processing: 'En traitement',
    status_shipped: 'Expédié',
    status_delivered: 'Livré',
    status_cancelled: 'Annulé',
  },

  en: {
    // Navbar
    nav_home: 'Home',
    nav_products: 'Products',
    nav_login: 'Log in',
    nav_register: 'Sign up',
    nav_account: 'My profile',
    nav_orders: 'My orders',
    nav_logout: 'Log out',
    nav_dashboard: 'Dashboard',

    // Home
    home_hero_title: 'Professional Distribution',
    home_hero_sub: 'Connected to Microsoft Business Central — personalized B2B pricing, real-time inventory, and streamlined ordering.',
    home_hero_cta: 'Our Products',
    home_hero_cta2: 'Open an Entrepreneur Account',
    home_stats_skus: 'References in catalogue',
    home_stats_delivery: 'Fast delivery',
    home_stats_bc: 'Real-time inventory',
    home_stats_b2b: 'Entrepreneur pricing',
    home_categories: 'Our Categories',
    home_cat_all: 'All Products',
    home_featured: 'Featured Products',
    home_featured_sub: 'A selection of our most popular items',
    home_b2b_title: 'Entrepreneur Solutions',
    home_b2b_sub: 'Negotiated pricing, centralized billing, real-time BC synchronization.',
    home_b2b_cta: 'Open an Entrepreneur Account',

    // Products
    products_title: 'Products',
    products_sub: 'Browse our full product catalogue',
    products_search: 'Search products…',
    products_all_cats: 'All categories',
    products_sort_newest: 'Newest',
    products_sort_price_asc: 'Price: low to high',
    products_sort_price_desc: 'Price: high to low',
    products_sort_name: 'Alphabetical',
    products_loading: 'Loading…',
    products_none: 'No products found.',

    // Product card / detail
    in_stock: 'In stock',
    low_stock: '{{n}} left in stock',
    out_of_stock: 'Out of stock',
    add_to_cart: 'Add to cart',
    added_to_cart: '✓ Added!',
    proceed_checkout: 'Proceed to checkout →',
    item_no: 'Item No:',
    description: 'Description',
    quantity: 'Quantity:',
    b2b_savings: 'Entrepreneur pricing applied. You save ${{n}} on this item.',

    // Breadcrumb
    breadcrumb_home: 'Home',
    breadcrumb_products: 'Products',
    product_not_found: 'Product not found',
    product_not_found_link: 'Back to products',

    // Cart
    cart_title: 'Shopping Cart',
    cart_empty_title: 'Your cart is empty',
    cart_empty_sub: "You haven't added any products yet.",
    cart_browse: 'Browse products',
    cart_clear: 'Clear cart',
    cart_product: 'Product',
    cart_price: 'Price',
    cart_qty: 'Qty',
    cart_subtotal: 'Subtotal',
    cart_remove: 'Remove',
    cart_summary: 'Order Summary',
    cart_items: '{{n}} item(s)',
    cart_shipping: 'Shipping',
    cart_shipping_note: 'Calculated at checkout',
    cart_total: 'Total',
    cart_checkout: 'Proceed to Checkout',
    cart_continue: 'Continue Shopping',

    // Account
    account_title: 'My Account',
    account_type: 'Account type',
    account_since: 'Member since',
    account_orders_total: 'Total orders',
    account_orders_link: 'View all orders →',
    account_business: 'Entrepreneur Account',
    account_company: 'Company',
    account_vat: 'GST/QST',
    account_discount: 'Discount',
    account_pricelist: 'Price list',
    account_recent_orders: 'Recent Orders',
    account_view_all: 'View all',
    account_no_orders: 'No orders yet',
    account_start_shopping: 'Start shopping',
    account_order_items: '{{n}} item(s)',

    // Auth
    login_title: 'Log In',
    login_sub: 'Access your DSF customer account',
    login_email: 'Email address',
    login_password: 'Password',
    login_submit: 'Log in',
    login_submitting: 'Signing in…',
    login_no_account: 'No account yet?',
    login_create: 'Create an account',

    register_title: 'Create an Account',
    register_sub: 'Join DSF — Professional Distribution',
    register_account_type: 'Account type',
    register_personal: 'Personal',
    register_business: 'Entrepreneur',
    register_name: 'Full name',
    register_email: 'Email address',
    register_password: 'Password',
    register_password_hint: 'At least 8 characters',
    register_confirm: 'Confirm password',
    register_company: 'Company name',
    register_vat: 'GST/QST number (optional)',
    register_customer_no: 'Customer number (optional)',
    register_customer_no_hint: 'Your DSF customer number, if you have one',
    register_no_customer_no: 'I don\'t have a customer number',
    register_account_request_label: 'In that case, what would you like to do?',
    register_account_request_new: 'Submit an entrepreneur account opening request',
    register_account_request_existing: 'I already have an account but don\'t know my number',
    register_submit: 'Create my account',
    register_submitting: 'Creating…',
    register_has_account: 'Already have an account?',
    register_login: 'Log in',

    // Checkout
    checkout_title: 'Checkout',
    checkout_empty: 'Your cart is empty.',
    checkout_browse: 'Browse products',
    checkout_billing: 'Billing information',
    checkout_fullname: 'Full name',
    checkout_email: 'Email address',
    checkout_address: 'Address',
    checkout_city: 'City',
    checkout_postal: 'Postal code',
    checkout_country: 'Country',
    checkout_payment: 'Secure payment',
    checkout_stripe_note: 'Secured by Stripe (PCI-DSS)',
    checkout_terms: 'By placing your order, you accept our',
    checkout_conditions: 'terms and conditions',
    checkout_submit: 'Confirm and pay',
    checkout_processing: 'Processing…',
    checkout_order_summary: 'Order Summary',

    // Footer
    footer_nav: 'Navigation',
    footer_products: 'Products',
    footer_account: 'My account',
    footer_orders: 'My orders',
    footer_conditions: 'Terms of sale',
    footer_contact: 'Contact',
    footer_copy: '© {{year}} Distribution Ste-Foy (DSF). All rights reserved.',

    // Status / badges
    status_active: 'Active',
    status_inactive: 'Inactive',
    status_pending: 'Pending',
    status_processing: 'Processing',
    status_shipped: 'Shipped',
    status_delivered: 'Delivered',
    status_cancelled: 'Cancelled',
  },
} as const

export type TranslationKey = keyof typeof T.fr

// ─── Context ──────────────────────────────────────────────────────────────────

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nCtx>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const saved = localStorage.getItem('dsf-lang') as Lang | null
    if (saved === 'fr' || saved === 'en') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('dsf-lang', l)
    document.documentElement.lang = l
  }

  function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const dict = T[lang] as Record<string, string>
    let str = dict[key] ?? (T.fr as Record<string, string>)[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{{${k}}}`, String(v))
      }
    }
    return str
  }

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
