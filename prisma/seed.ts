import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Panneaux de gypse',       slug: 'panneaux-gypse',       description: 'Panneaux de gypse standard, résistants au feu, hydrofuges et ultra-légers.' },
  { name: 'Ossature métallique',     slug: 'ossature-metallique',  description: 'Montants, lisses et accessoires en acier pour cloisons et plafonds.' },
  { name: 'Isolation',               slug: 'isolation',            description: 'Laine de verre, laine de roche et panneaux rigides pour murs, toits et planchers.' },
  { name: 'Composés & enduits',      slug: 'composes-enduits',     description: 'Composés à joint, enduits de finition et mélanges à prise rapide.' },
  { name: 'Systèmes de plafond',     slug: 'systemes-plafond',     description: 'Suspentes, fourrures, grilles T-bar et accessoires de plafond suspendu.' },
  { name: 'Cornières & moulures',    slug: 'cornieres-moulures',   description: 'Cornières métal et PVC, moulures J/L, bandes de joint papier et fibre.' },
  { name: 'Outils & fixations',      slug: 'outils-fixations',     description: 'Vis à gypse, agrafes et outils de pose spécialisés.' },
  { name: 'Acoustique',              slug: 'acoustique',           description: 'Solutions acoustiques : laine soufflée, panneaux et membranes résilientes.' },
]

// ─── Products ─────────────────────────────────────────────────────────────────

const PRODUCTS = [

  // ─ Panneaux de gypse (CGC Sheetrock) ─────────────────────────────────────

  {
    bcItemNo: 'CGC-SW-48-12',
    name: 'CGC Sheetrock® Panneau gypse standard 1/2" — 4\'×8\'',
    description: 'Panneau de gypse standard 1/2 po à âme de gypse régulière, couvertures en papier. Idéal pour les applications de murs et plafonds intérieurs résidentiels et commerciaux.',
    price: 12.45, stock: 2400, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-SW-49-12',
    name: 'CGC Sheetrock® Panneau gypse standard 1/2" — 4\'×9\'',
    description: 'Panneau de gypse standard 1/2 po en format 4 × 9 pi. Moins de joints horizontaux sur les murs à hauteur plafond standard.',
    price: 14.25, stock: 1800, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-SW-410-12',
    name: 'CGC Sheetrock® Panneau gypse standard 1/2" — 4\'×10\'',
    description: 'Format grand panneau 4 × 10 pi pour les espaces à grande hauteur. Réduit le nombre de joints et accélère la pose.',
    price: 16.15, stock: 1200, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-SW-412-12',
    name: 'CGC Sheetrock® Panneau gypse standard 1/2" — 4\'×12\'',
    description: 'Format 4 × 12 pi pour les grandes surfaces commerciales. Minimise les joints et optimise la productivité de la main-d\'œuvre.',
    price: 19.50, stock: 900, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-SW-48-58X',
    name: 'CGC Sheetrock® Panneau type X 5/8" — 4\'×8\'',
    description: 'Panneau coupe-feu type X 5/8 po avec fibres de verre dans l\'âme. Cote pare-feu ULC 1 h pour assemblages de cloisons.',
    price: 17.25, stock: 1600, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-SW-410-58X',
    name: 'CGC Sheetrock® Panneau type X 5/8" — 4\'×10\'',
    description: 'Type X 5/8 po en format 4 × 10 pi. Protection incendie certifiée ULC pour les murs commerciaux et les séparations coupe-feu.',
    price: 21.50, stock: 1100, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-SW-412-58X',
    name: 'CGC Sheetrock® Panneau type X 5/8" — 4\'×12\'',
    description: 'Format 4 × 12 pi type X. Haute performance pour les projets commerciaux nécessitant une résistance au feu et de grandes surfaces sans joint.',
    price: 25.85, stock: 750, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-HUM-48-12',
    name: 'CGC Sheetrock® Humitek™ 1/2" — 4\'×8\'',
    description: 'Panneau résistant à l\'humidité 1/2 po avec âme spéciale et couverture hydrofuge verte. Recommandé pour salles de bains, cuisines et sous-sols.',
    price: 16.95, stock: 1000, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-HUM-48-58',
    name: 'CGC Sheetrock® Humitek™ 5/8" — 4\'×8\'',
    description: 'Panneau résistant à l\'humidité 5/8 po type X. Combine la protection incendie et la résistance à l\'humidité pour les zones mixtes.',
    price: 20.25, stock: 750, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-UL-48-12',
    name: 'CGC Sheetrock® Ultralight 1/2" — 4\'×8\'',
    description: 'Panneau ultra-léger 1/2 po — jusqu\'à 30 % plus léger que le gypse standard. Facilite la manutention et réduit la fatigue des installateurs.',
    price: 14.75, stock: 1400, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-UL-410-12',
    name: 'CGC Sheetrock® Ultralight 1/2" — 4\'×10\'',
    description: 'Format 4 × 10 pi ultra-léger pour les grandes surfaces. Idéal pour les projets où la productivité et le confort de l\'installateur sont prioritaires.',
    price: 18.50, stock: 900, category: 'Panneaux de gypse',
  },
  {
    bcItemNo: 'CGC-DEN-48-12',
    name: 'CGC Densglass® Gold 1/2" — 4\'×8\'',
    description: 'Panneau de sous-face en fibre de verre pour l\'extérieur. Résistant à l\'humidité et au vent, utilisé comme substrat sous les revêtements extérieurs.',
    price: 38.95, stock: 400, category: 'Panneaux de gypse',
  },

  // ─ Ossature métallique (EB Metal) ─────────────────────────────────────────

  {
    bcItemNo: 'EBM-STD-158-10-25',
    name: 'EB Metal Montant acier 25ga — 1-5/8" × 10\'',
    description: 'Montant en acier galvanisé calibre 25 de 1-5/8 po de largeur, longueur 10 pi. Utilisé pour les cloisons intérieures légères non porteuses.',
    price: 3.25, stock: 5000, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-STD-158-10-20',
    name: 'EB Metal Montant acier 20ga — 1-5/8" × 10\'',
    description: 'Montant en acier galvanisé calibre 20 de 1-5/8 po. Résistance accrue pour les assemblages nécessitant une plus grande rigidité.',
    price: 4.85, stock: 3000, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-STD-212-10-25',
    name: 'EB Metal Montant acier 25ga — 2-1/2" × 10\'',
    description: 'Montant galvanisé 25ga de 2-1/2 po. Format standard pour les cloisons intérieures avec isolant mince.',
    price: 3.95, stock: 6000, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-STD-212-10-20',
    name: 'EB Metal Montant acier 20ga — 2-1/2" × 10\'',
    description: 'Montant galvanisé 20ga de 2-1/2 po. Calibre structurel pour les cloisons hautes ou les assemblages soumis à des charges latérales.',
    price: 5.45, stock: 3500, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-STD-358-10-25',
    name: 'EB Metal Montant acier 25ga — 3-5/8" × 10\'',
    description: 'Montant galvanisé 25ga de 3-5/8 po, le format le plus courant en construction commerciale. Compatible avec l\'isolant R-12 2×4.',
    price: 4.65, stock: 8000, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-STD-358-10-20',
    name: 'EB Metal Montant acier 20ga — 3-5/8" × 10\'',
    description: 'Montant galvanisé 20ga de 3-5/8 po. Robuste pour les projets commerciaux exigeants. Convient aux cloisons de grande hauteur.',
    price: 6.25, stock: 5000, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-STD-358-12-25',
    name: 'EB Metal Montant acier 25ga — 3-5/8" × 12\'',
    description: 'Montant de 3-5/8 po en longueur 12 pi. Pour les espaces à hauteur de plafond élevée sans raccord de montant.',
    price: 5.55, stock: 3000, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-STD-600-10-25',
    name: 'EB Metal Montant acier 25ga — 6" × 10\'',
    description: 'Montant galvanisé 25ga de 6 po. Utilisé pour les cloisons extérieures ou les assemblages nécessitant un isolant R-20 ou plus.',
    price: 5.75, stock: 2500, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-STD-600-10-20',
    name: 'EB Metal Montant acier 20ga — 6" × 10\'',
    description: 'Montant galvanisé 20ga de 6 po. Haute résistance pour les murs de périmètre avec isolation thermique épaisse.',
    price: 7.95, stock: 1500, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-TRK-212-10-25',
    name: 'EB Metal Lisse (track) 25ga — 2-1/2" × 10\'',
    description: 'Lisse en acier galvanisé 25ga de 2-1/2 po pour semelles de plancher et de plafond. Compatible avec les montants 2-1/2 po.',
    price: 3.45, stock: 4000, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-TRK-358-10-25',
    name: 'EB Metal Lisse (track) 25ga — 3-5/8" × 10\'',
    description: 'Lisse galvanisée 25ga de 3-5/8 po, la plus utilisée en construction commerciale. Fixation au plancher béton ou à la charpente bois.',
    price: 3.95, stock: 6000, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-TRK-358-10-20',
    name: 'EB Metal Lisse (track) 20ga — 3-5/8" × 10\'',
    description: 'Lisse galvanisée 20ga de 3-5/8 po. Calibre structurel recommandé pour les assemblages de grande hauteur.',
    price: 5.25, stock: 3500, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-TRK-600-10-25',
    name: 'EB Metal Lisse (track) 25ga — 6" × 10\'',
    description: 'Lisse galvanisée 25ga de 6 po pour les systèmes d\'isolation épaisse. Assortie aux montants 6 po.',
    price: 4.95, stock: 2000, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-RC1-12-25',
    name: 'EB Metal Fourrure résiliente RC-1 25ga × 12\'',
    description: 'Canal résilient RC-1 en acier 25ga. Améliore l\'isolement acoustique STC des cloisons et plafonds en découplant le gypse de l\'ossature.',
    price: 3.85, stock: 4500, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-HAT-10-25',
    name: 'EB Metal Canal chapeau (hat channel) 25ga × 10\'',
    description: 'Canal chapeau galvanisé 25ga, profil en forme de chapeau haut-de-forme. Utilisé pour les plafonds et comme fourrure secondaire.',
    price: 3.15, stock: 4000, category: 'Ossature métallique',
  },
  {
    bcItemNo: 'EBM-ANGLE-20',
    name: 'EB Metal Cornière de plafond 20ga — 3-1/2"×3-1/2" × 10\'',
    description: 'Cornière structurelle galvanisée 20ga. Sert de périmètre pour les plafonds suspendus et de renforts dans les assemblages d\'acier.',
    price: 6.45, stock: 2000, category: 'Ossature métallique',
  },

  // ─ Isolation ──────────────────────────────────────────────────────────────

  {
    bcItemNo: 'INS-GW-R12-16-BT',
    name: 'Laine de verre R-12 — 2×4 16" — emb. 40 pi²',
    description: 'Isolant en laine de verre R-12 en batt, largeur 15-1/4 po pour ossature 16 po c/c. Emballage de 40 pi² net. Sans formaldéhyde.',
    price: 24.95, stock: 800, category: 'Isolation',
  },
  {
    bcItemNo: 'INS-GW-R12-24-BT',
    name: 'Laine de verre R-12 — 2×4 24" — emb. 40 pi²',
    description: 'Batt R-12 largeur 23-1/4 po pour ossature 24 po c/c. Emballage de 40 pi². Coupe facilement au couteau.',
    price: 27.95, stock: 600, category: 'Isolation',
  },
  {
    bcItemNo: 'INS-GW-R20-16-BT',
    name: 'Laine de verre R-20 — 2×6 16" — emb. 40 pi²',
    description: 'Batt R-20 en laine de verre pour ossature 2×6 à 16 po c/c. Emballage de 40 pi². Application : murs extérieurs, plafonds sous toit.',
    price: 39.95, stock: 600, category: 'Isolation',
  },
  {
    bcItemNo: 'INS-RW-AC-16-BT',
    name: 'Laine de roche acoustique — 2×4 16" — emb. 40 pi²',
    description: 'Panneau batt en laine de roche à haute densité pour l\'atténuation acoustique. Améliore le STC des cloisons de 6 à 8 points vs laine de verre.',
    price: 49.95, stock: 500, category: 'Isolation',
  },
  {
    bcItemNo: 'INS-EPS-1-48',
    name: 'Panneau rigide EPS 1" — 4\'×8\'',
    description: 'Panneau isolant en polystyrène expansé (EPS) 1 po, valeur R-4. Résistant à l\'humidité, léger et facile à couper. Application : fondations, planchers, murs.',
    price: 16.95, stock: 500, category: 'Isolation',
  },
  {
    bcItemNo: 'INS-EPS-2-48',
    name: 'Panneau rigide EPS 2" — 4\'×8\'',
    description: 'Panneau EPS 2 po valeur R-8. Double couche possible pour atteindre R-16. Souvent utilisé sous la dalle ou en isolation continue de murs.',
    price: 29.95, stock: 400, category: 'Isolation',
  },
  {
    bcItemNo: 'INS-XPS-1-48',
    name: 'Panneau rigide XPS 1" — 4\'×8\'',
    description: 'Panneau extrudé (XPS) rose 1 po, valeur R-5. Résistance accrue à l\'humidité et à la compression vs EPS. Idéal pour fondations et dalles.',
    price: 22.95, stock: 450, category: 'Isolation',
  },
  {
    bcItemNo: 'INS-XPS-2-48',
    name: 'Panneau rigide XPS 2" — 4\'×8\'',
    description: 'Panneau XPS 2 po valeur R-10. Haute performance thermique et résistance à l\'humidité pour les projets d\'enveloppe exigeants.',
    price: 39.95, stock: 350, category: 'Isolation',
  },
  {
    bcItemNo: 'INS-BATT-R24-16',
    name: 'Laine de verre R-24 — Comble 16" — emb. 50 pi²',
    description: 'Batt de grenier R-24 sans pare-vapeur, largeur 15-1/4 po. Emballage de 50 pi². Parfait pour la mise à niveau de l\'isolation de combles.',
    price: 44.95, stock: 400, category: 'Isolation',
  },

  // ─ Composés & enduits (CGC) ───────────────────────────────────────────────

  {
    bcItemNo: 'CGC-COMP-20KG',
    name: 'CGC Sheetrock® Composé à joint prêt à l\'emploi — seau 20 kg',
    description: 'Composé à joint prêt à l\'emploi polyvalent CGC pour les 3 couches (ruban, intermédiaire, finition). Seau de 20 kg. Excellente adhérence, faible retrait au séchage.',
    price: 22.95, stock: 600, category: 'Composés & enduits',
  },
  {
    bcItemNo: 'CGC-COMP-PF-18',
    name: 'CGC Sheetrock® Composé préfini — seau 18 L',
    description: 'Composé de finition à texture fine pour la couche de finition. Seau de 18 L. Poncé facilement, surface lisse garantie.',
    price: 28.95, stock: 500, category: 'Composés & enduits',
  },
  {
    bcItemNo: 'CGC-DUR-20-25',
    name: 'CGC Durabond® 20 — composé à prise — sac 25 lb',
    description: 'Composé à prise chimique Durabond 20 (prise en 20 min). Utilisé pour le premier enrobage des bandes et la réparation des fissures. Sac de 25 lb en poudre.',
    price: 19.95, stock: 700, category: 'Composés & enduits',
  },
  {
    bcItemNo: 'CGC-DUR-45-25',
    name: 'CGC Durabond® 45 — composé à prise — sac 25 lb',
    description: 'Composé à prise Durabond 45 (prise en 45 min). Plus de temps de travail que le Durabond 20. Idéal pour les travaux étendus et les conditions chaudes.',
    price: 19.95, stock: 700, category: 'Composés & enduits',
  },
  {
    bcItemNo: 'CGC-DUR-90-25',
    name: 'CGC Durabond® 90 — composé à prise — sac 25 lb',
    description: 'Composé à prise Durabond 90 (prise en 90 min). Temps ouvert maximal de la gamme Durabond. Utile en conditions froides ou pour les grandes surfaces.',
    price: 19.95, stock: 600, category: 'Composés & enduits',
  },
  {
    bcItemNo: 'CGC-IMP-FIN-18',
    name: 'CGC Imperial® Finish — enduit de finition — seau 18 L',
    description: 'Enduit de finition à glaçure Imperial® pour plafonds texturés et finis lisses. Seau 18 L. Résistance améliorée aux marques et aux égratignures.',
    price: 34.95, stock: 350, category: 'Composés & enduits',
  },
  {
    bcItemNo: 'CGC-COMP-PWD-40',
    name: 'CGC Sheetrock® Composé en poudre — sac 40 lb',
    description: 'Composé à joint en poudre à mélanger à l\'eau. Sac de 40 lb. Longue durée de conservation, plus économique que les produits prêts à l\'emploi en gros volumes.',
    price: 25.95, stock: 500, category: 'Composés & enduits',
  },
  {
    bcItemNo: 'CGC-TOP-18',
    name: 'CGC Sheetrock® Topping — composé de dessus — seau 18 L',
    description: 'Composé de dessus ultra-lisse pour la couche de finition finale. Seau 18 L. Réduction maximale du temps de ponçage pour les surfaces peintes.',
    price: 27.95, stock: 400, category: 'Composés & enduits',
  },
  {
    bcItemNo: 'CGC-EASE-4L',
    name: 'CGC Sheetrock® Ease of Sanding — seau 4 L',
    description: 'Composé de finition à ponçage facile en petit format 4 L. Idéal pour les retouches et les petits travaux de finition sur site.',
    price: 12.95, stock: 450, category: 'Composés & enduits',
  },

  // ─ Systèmes de plafond ────────────────────────────────────────────────────

  {
    bcItemNo: 'PLF-TBAR-15-12',
    name: 'Grille principale T-bar 15/16" — 12\'',
    description: 'Grille principale en acier galvanisé 15/16 po largeur de face pour plafonds suspendus 2×2 et 2×4. Longueur 12 pi. Capacité de charge 10 lb/pi.',
    price: 6.95, stock: 1500, category: 'Systèmes de plafond',
  },
  {
    bcItemNo: 'PLF-TBAR-15-CR2',
    name: 'Grille secondaire T-bar 15/16" — 2\'',
    description: 'Raidisseur transversal 15/16 po largeur de face, longueur 2 pi. Complète la grille principale pour les modules 2×2.',
    price: 1.45, stock: 5000, category: 'Systèmes de plafond',
  },
  {
    bcItemNo: 'PLF-TBAR-15-CR4',
    name: 'Grille secondaire T-bar 15/16" — 4\'',
    description: 'Raidisseur transversal 15/16 po, longueur 4 pi. Pour les modules 2×4 po. Clipsage rapide sans outil.',
    price: 2.45, stock: 4000, category: 'Systèmes de plafond',
  },
  {
    bcItemNo: 'PLF-ANGLE-PERIM',
    name: 'Moulure périmètre L 1-1/2" × 1-1/2" — 12\'',
    description: 'Moulure de périmètre en L pour plafonds suspendus. Fixation au mur pour recevoir les grilles T. Longueur 12 pi. Peinture blanche.',
    price: 3.25, stock: 3000, category: 'Systèmes de plafond',
  },
  {
    bcItemNo: 'PLF-WIRE-8GA',
    name: 'Fil de suspension galvanisé 12ga — bobine 50\'',
    description: 'Fil d\'acier galvanisé calibre 12, bobine de 50 pi. Utilisé pour suspendre les grilles T-bar à la structure. Résistance de 50 lb par fil.',
    price: 8.95, stock: 2000, category: 'Systèmes de plafond',
  },
  {
    bcItemNo: 'PLF-CLIP-MAIN',
    name: 'Agrafe de suspension grille principale — sac 50',
    description: 'Agrafes galvanisées pour relier le fil de suspension à la grille principale. Sac de 50 unités. Installation rapide par simple glissage.',
    price: 5.95, stock: 2500, category: 'Systèmes de plafond',
  },
  {
    bcItemNo: 'PLF-FURR-12',
    name: 'EB Metal Fourrure métallique 25ga — 7/8" × 12\'',
    description: 'Fourrure métallique galvanisée 25ga de 7/8 po, longueur 12 pi. Utilisée pour les plafonds en plaques de gypse et les assemblages de plafonds directs.',
    price: 3.25, stock: 4000, category: 'Systèmes de plafond',
  },

  // ─ Cornières & moulures ───────────────────────────────────────────────────

  {
    bcItemNo: 'CGC-BEAD-34-8',
    name: 'CGC Cornière métal galvanisée 3/4" × 3/4" — 8\'',
    description: 'Cornière en métal galvanisé 3/4 × 3/4 po, longueur 8 pi. Protège les arêtes vives des panneaux de gypse. Perforée pour une meilleure adhérence du composé.',
    price: 2.45, stock: 3000, category: 'Cornières & moulures',
  },
  {
    bcItemNo: 'CGC-BEAD-114-8',
    name: 'CGC Cornière métal galvanisée 1-1/4" — 8\'',
    description: 'Cornière métal 1-1/4 po nez rond, longueur 8 pi. Pour arêtes exposées dans les angles. Résiste aux chocs mieux que la cornière 3/4 po.',
    price: 2.95, stock: 2500, category: 'Cornières & moulures',
  },
  {
    bcItemNo: 'CGC-BEAD-PVC-8',
    name: 'CGC Cornière PVC flexible — 8\'',
    description: 'Cornière en PVC pour les angles irréguliers et les coins arrondis. Flexible, ne rouille pas. Longueur 8 pi.',
    price: 1.85, stock: 2000, category: 'Cornières & moulures',
  },
  {
    bcItemNo: 'CGC-MOL-J12-8',
    name: 'CGC Moulure J 1/2" — 8\'',
    description: 'Moulure J en métal galvanisé pour les extrémités libres de panneaux de gypse 1/2 po. Longueur 8 pi. Finition propre aux ouvertures et terminaisons.',
    price: 1.85, stock: 3500, category: 'Cornières & moulures',
  },
  {
    bcItemNo: 'CGC-MOL-J58-8',
    name: 'CGC Moulure J 5/8" — 8\'',
    description: 'Moulure J en métal galvanisé pour les panneaux 5/8 po. Longueur 8 pi.',
    price: 1.95, stock: 2500, category: 'Cornières & moulures',
  },
  {
    bcItemNo: 'CGC-MOL-L-8',
    name: 'CGC Moulure L 3/4" — 8\'',
    description: 'Moulure L pour la jonction entre le gypse et un autre matériau (béton, maçonnerie). Longueur 8 pi. Évite les fissures aux jonctions de matériaux différents.',
    price: 1.95, stock: 2500, category: 'Cornières & moulures',
  },
  {
    bcItemNo: 'CGC-TAPE-250',
    name: 'CGC Sheetrock® Bande de joint papier — 250\'',
    description: 'Bande de joint en papier gaufré 250 pi. Résistante à la déchirure et à l\'humidité en cours de séchage. Donne un joint plus mince et plus solide que la fibre de verre.',
    price: 9.95, stock: 2000, category: 'Cornières & moulures',
  },
  {
    bcItemNo: 'CGC-TAPE-FG-300',
    name: 'CGC Sheetrock® Bande de joint fibre de verre — 300\'',
    description: 'Bande de joint auto-adhésive en fibre de verre 300 pi. Résistante à la fissuration, idéale avec les composés à prise Durabond. Pose sans enrobage préalable.',
    price: 12.95, stock: 1800, category: 'Cornières & moulures',
  },

  // ─ Outils & fixations ─────────────────────────────────────────────────────

  {
    bcItemNo: 'FIX-SCREW-114-1000',
    name: 'Vis à gypse phosphatée 6 × 1-1/4" — boîte 1000',
    description: 'Vis à gypse filet fin phosphatée no 6, longueur 1-1/4 po. Boîte de 1000. Pour gypse sur ossature bois. Tête trompette auto-noyante.',
    price: 13.95, stock: 1200, category: 'Outils & fixations',
  },
  {
    bcItemNo: 'FIX-SCREW-158-1000',
    name: 'Vis à gypse phosphatée 6 × 1-5/8" — boîte 1000',
    description: 'Vis à gypse filet fin no 6, longueur 1-5/8 po. Boîte de 1000. Format le plus courant pour gypse 1/2 po sur ossature bois ou acier.',
    price: 14.95, stock: 1500, category: 'Outils & fixations',
  },
  {
    bcItemNo: 'FIX-SCREW-SS-716',
    name: 'Vis acier-acier S-12 7/16" — boîte 1000',
    description: 'Vis autoperceuse S-12 tête pan 7/16 po pour fixer l\'acier galvanisé jusqu\'à 20ga. Boîte de 1000. Fixation rapide de l\'ossature métallique.',
    price: 15.95, stock: 1200, category: 'Outils & fixations',
  },
  {
    bcItemNo: 'FIX-SCREW-SS-114',
    name: 'Vis acier-acier S-12 1-1/4" — boîte 1000',
    description: 'Vis autoperceuse S-12 1-1/4 po pour gypse sur ossature acier jusqu\'à 20ga. Boîte de 1000. Fixe le panneau et l\'ossature en un seul passage.',
    price: 16.95, stock: 1200, category: 'Outils & fixations',
  },
  {
    bcItemNo: 'FIX-SCREW-SS-158',
    name: 'Vis acier-acier S-12 1-5/8" — boîte 1000',
    description: 'Vis autoperceuse S-12 1-5/8 po pour gypse 1/2 po sur ossature acier 25ga–20ga. Boîte de 1000. Format standard en construction commerciale.',
    price: 17.95, stock: 1500, category: 'Outils & fixations',
  },
  {
    bcItemNo: 'TOOL-KNIFE-6',
    name: 'Couteau à gypse 6" — lame inox',
    description: 'Couteau à enduire professionnel 6 po à lame flexible en acier inoxydable. Manche ergonomique. Pour l\'application de composé en première couche.',
    price: 14.95, stock: 300, category: 'Outils & fixations',
  },
  {
    bcItemNo: 'TOOL-KNIFE-10',
    name: 'Couteau à gypse 10" — lame inox',
    description: 'Couteau à enduire professionnel 10 po à lame flexible inox. Idéal pour la couche intermédiaire sur les larges surfaces. Manche antidérapant.',
    price: 19.95, stock: 250, category: 'Outils & fixations',
  },
  {
    bcItemNo: 'TOOL-KNIFE-12',
    name: 'Couteau à gypse 12" — lame inox',
    description: 'Couteau à enduire 12 po extra large pour la couche de finition. Couvre une grande surface avec moins de passages. Lame inox flexible.',
    price: 24.95, stock: 200, category: 'Outils & fixations',
  },
  {
    bcItemNo: 'TOOL-CORNER-TROWEL',
    name: 'Truelle d\'angle intérieur — 4"',
    description: 'Truelle d\'angle intérieur en acier inoxydable, 4 po par côté. Pour les coins intérieurs parfaits en une seule passe. Indispensable pour les finisseurs de gypse.',
    price: 18.95, stock: 150, category: 'Outils & fixations',
  },
  {
    bcItemNo: 'TOOL-MUD-PAN',
    name: 'Bac à composé galvanisé — 14"',
    description: 'Bac à composé galvanisé de 14 po avec bord en acier pour nettoyer le couteau. Contient suffisamment de composé pour une longue surface.',
    price: 12.95, stock: 200, category: 'Outils & fixations',
  },

  // ─ Acoustique ─────────────────────────────────────────────────────────────

  {
    bcItemNo: 'ACU-RW-SAFE-BT',
    name: 'Laine de roche Rockwool Safe\'n\'Sound® 3" — 16" — emb. 40 pi²',
    description: 'Panneau en laine de roche 3 po pour les assemblages de planchers et cloisons intérieures. STC 45–55. Incombustible et résistant à la moisissure. Emballage 40 pi².',
    price: 54.95, stock: 400, category: 'Acoustique',
  },
  {
    bcItemNo: 'ACU-RW-COMFORTBATT',
    name: 'Laine de roche Rockwool Comfortbatt® R-14 — 16"',
    description: 'Batt en laine de roche R-14 3-1/2 po. Combine performance thermique et acoustique dans un seul produit. Résistant au feu, à l\'eau et aux moisissures.',
    price: 59.95, stock: 350, category: 'Acoustique',
  },
  {
    bcItemNo: 'ACU-MEM-ISOL',
    name: 'Membrane acoustique résiliente IsoStep® — rouleau 100 pi²',
    description: 'Membrane acoustique résiliente sous-plancher en caoutchouc recyclé 3 mm. Atténue les bruits d\'impact. Rouleau de 100 pi². IIC Delta +19.',
    price: 89.95, stock: 200, category: 'Acoustique',
  },
  {
    bcItemNo: 'ACU-SEAL-ACOUSTIK',
    name: 'Scellant acoustique Acoustik® — cartouche 825 ml',
    description: 'Scellant permanent à base d\'eau pour colmater les joints dans les assemblages de cloisons acoustiques. Cartouche 825 ml. Demeure souple, ne durcit pas.',
    price: 11.95, stock: 600, category: 'Acoustique',
  },
  {
    bcItemNo: 'ACU-STUD-DECOUPLER',
    name: 'Découplement de montant acoustique — emb. 50',
    description: 'Isolateur de vibrations en EPDM à fixer aux montants acier avant la pose du gypse. Réduit la transmission sonore en découplant l\'ossature du parement. Emballage 50 unités.',
    price: 29.95, stock: 400, category: 'Acoustique',
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('⏳ Seeding categories...')

  // Upsert categories
  const categoryMap: Record<string, string> = {}
  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, description: cat.description },
    })
    categoryMap[cat.name] = record.id
    console.log(`  ✓ Category: ${cat.name}`)
  }

  console.log('\n⏳ Seeding products...')

  for (const p of PRODUCTS) {
    const catId = categoryMap[p.category]
    await prisma.product.upsert({
      where:  { bcItemNo: p.bcItemNo },
      create: {
        bcItemNo:    p.bcItemNo,
        name:        p.name,
        description: p.description,
        price:       p.price,
        stock:       p.stock,
        category:    p.category,
        categoryId:  catId,
        active:      true,
      },
      update: {
        name:        p.name,
        description: p.description,
        price:       p.price,
        stock:       p.stock,
        category:    p.category,
        categoryId:  catId,
        active:      true,
      },
    })
    console.log(`  ✓ ${p.bcItemNo}  ${p.name.slice(0, 60)}`)
  }

  console.log(`\n✅ Done — ${CATEGORIES.length} categories, ${PRODUCTS.length} products.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
