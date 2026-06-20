import { SettingsService } from './SettingsService'

/**
 * BrandService — variables d'identité et palette de couleurs du site.
 *
 * Source unique de vérité pour :
 *  - le nom court (DSF), le nom légal (Distribution Ste-Foy Ltée), le slogan, le logo
 *  - la palette de couleurs (primaire, foncé, fond, texte, atténué)
 *
 * Utilisé partout : variables CSS du site (injectées dans le layout racine)
 * ET couleurs/nom des courriels (substitution de jetons).
 */

export interface Brand {
  nameShort:        string // ex. DSF
  nameLegal:        string // ex. Distribution Ste-Foy Ltée
  tagline:          string // ex. DISTRIBUTION
  logoUrl:          string // ex. /dsf-logo.png
  colorPrimary:     string // accent (rouge)
  colorPrimaryDark: string // accent survol
  colorDark:        string // entête / nav / texte fort
  colorText:        string // texte courant
  colorMuted:       string // texte atténué
  colorBg:          string // fond de page
}

export class BrandService {
  static readonly DEFAULTS: Brand = {
    nameShort:        'DSF',
    nameLegal:        'Distribution Ste-Foy Ltée',
    tagline:          'DISTRIBUTION',
    logoUrl:          '/dsf-logo.png',
    colorPrimary:     '#e51937',
    colorPrimaryDark: '#c0102a',
    colorDark:        '#1f2232',
    colorText:        '#1f2232',
    colorMuted:       '#6b7280',
    colorBg:          '#f3f4f6',
  }

  // clé Brand → clé settings (BD)
  static readonly KEY_MAP: Record<keyof Brand, string> = {
    nameShort:        'brand_name_short',
    nameLegal:        'brand_name_legal',
    tagline:          'brand_tagline',
    logoUrl:          'brand_logo_url',
    colorPrimary:     'brand_color_primary',
    colorPrimaryDark: 'brand_color_primary_dark',
    colorDark:        'brand_color_dark',
    colorText:        'brand_color_text',
    colorMuted:       'brand_color_muted',
    colorBg:          'brand_color_bg',
  }

  static get SETTING_KEYS(): string[] {
    return Object.values(this.KEY_MAP)
  }

  /** Lit la marque depuis la BD avec repli sur les valeurs par défaut. */
  static async get(): Promise<Brand> {
    const stored = await SettingsService.getMany(this.SETTING_KEYS)
    const brand = { ...this.DEFAULTS }
    for (const key of Object.keys(this.KEY_MAP) as (keyof Brand)[]) {
      const v = stored[this.KEY_MAP[key]]
      if (v) brand[key] = v
    }
    return brand
  }

  /** Bloc `:root { --brand-*: … }` à injecter dans le <head> du site. */
  static cssVariables(brand: Brand): string {
    return `:root{` +
      `--brand-primary:${brand.colorPrimary};` +
      `--brand-primary-dark:${brand.colorPrimaryDark};` +
      `--brand-dark:${brand.colorDark};` +
      `--brand-text:${brand.colorText};` +
      `--brand-muted:${brand.colorMuted};` +
      `--brand-bg:${brand.colorBg};` +
      `}`
  }

  /** Valide qu'une chaîne est une couleur hex (#abc ou #aabbcc). */
  static isHexColor(v: string): boolean {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)
  }
}
