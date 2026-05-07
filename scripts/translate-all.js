// Run: node scripts/translate-all.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── Category translations ────────────────────────────────────────────────────

const CATEGORY_TRANSLATIONS = {
  'Panneaux de gypse':    'Drywall Panels',
  'Ossature métallique':  'Metal Framing',
  'Isolation':            'Insulation',
  'Composés & enduits':   'Compounds & Finishes',
  'Systèmes de plafond':  'Ceiling Systems',
  'Cornières & moulures': 'Corner Beads & Trim',
  'Outils & fixations':   'Tools & Fasteners',
  'Acoustique':           'Acoustics',
}

// ─── Product translations ─────────────────────────────────────────────────────
// Key = exact French name, value = { nameEn, descriptionEn }

const PRODUCT_TRANSLATIONS = {
  // ── Drywall panels ───────────────────────────────────────────────────────────
  'CGC Sheetrock® Panneau gypse standard 1/2" — 4\'×8\'': {
    nameEn: 'CGC Sheetrock® Standard Gypsum Panel 1/2" — 4\'×8\'',
    descriptionEn: 'Standard 1/2" gypsum panel with regular gypsum core and paper facings. Ideal for residential and commercial interior wall and ceiling applications.',
  },
  'CGC Sheetrock® Panneau gypse standard 1/2" — 4\'×9\'': {
    nameEn: 'CGC Sheetrock® Standard Gypsum Panel 1/2" — 4\'×9\'',
    descriptionEn: 'Standard 1/2" gypsum panel in 4×9 ft format. Fewer horizontal joints on standard ceiling-height walls.',
  },
  'CGC Sheetrock® Panneau gypse standard 1/2" — 4\'×10\'': {
    nameEn: 'CGC Sheetrock® Standard Gypsum Panel 1/2" — 4\'×10\'',
    descriptionEn: 'Large 4×10 ft panel format for high-ceiling spaces. Reduces joint count and speeds up installation.',
  },
  'CGC Sheetrock® Panneau gypse standard 1/2" — 4\'×12\'': {
    nameEn: 'CGC Sheetrock® Standard Gypsum Panel 1/2" — 4\'×12\'',
    descriptionEn: '4×12 ft format for large commercial surfaces. Minimizes joints and optimizes labor productivity.',
  },
  'CGC Sheetrock® Panneau type X 5/8" — 4\'×8\'': {
    nameEn: 'CGC Sheetrock® Type X Gypsum Panel 5/8" — 4\'×8\'',
    descriptionEn: 'Type X fire-rated 5/8" gypsum panel with fiberglass in the core. ULC 1-hour fire rating for partition assemblies.',
  },
  'CGC Sheetrock® Panneau type X 5/8" — 4\'×10\'': {
    nameEn: 'CGC Sheetrock® Type X Gypsum Panel 5/8" — 4\'×10\'',
    descriptionEn: 'Type X 5/8" in 4×10 ft format. ULC-certified fire protection for commercial walls and fire-separation assemblies.',
  },
  'CGC Sheetrock® Panneau type X 5/8" — 4\'×12\'': {
    nameEn: 'CGC Sheetrock® Type X Gypsum Panel 5/8" — 4\'×12\'',
    descriptionEn: '4×12 ft Type X format. High performance for commercial projects requiring fire resistance and large joint-free surfaces.',
  },
  'CGC Sheetrock® Humitek™ 1/2" — 4\'×8\'': {
    nameEn: 'CGC Sheetrock® Humitek™ 1/2" — 4\'×8\'',
    descriptionEn: '1/2" moisture-resistant panel with special core and green water-repellent facing. Recommended for bathrooms, kitchens and basements.',
  },
  'CGC Sheetrock® Humitek™ 5/8" — 4\'×8\'': {
    nameEn: 'CGC Sheetrock® Humitek™ 5/8" — 4\'×8\'',
    descriptionEn: '5/8" Type X moisture-resistant panel. Combines fire protection and moisture resistance for mixed-use areas.',
  },
  'CGC Sheetrock® Ultralight 1/2" — 4\'×8\'': {
    nameEn: 'CGC Sheetrock® Ultralight 1/2" — 4\'×8\'',
    descriptionEn: 'Ultra-lightweight 1/2" panel — up to 30% lighter than standard gypsum. Easier to handle and reduces installer fatigue.',
  },
  'CGC Sheetrock® Ultralight 1/2" — 4\'×10\'': {
    nameEn: 'CGC Sheetrock® Ultralight 1/2" — 4\'×10\'',
    descriptionEn: 'Ultra-lightweight 4×10 ft format for large surfaces. Ideal for projects where productivity and installer comfort are the priority.',
  },
  'CGC Densglass® Gold 1/2" — 4\'×8\'': {
    nameEn: 'CGC Densglass® Gold 1/2" — 4\'×8\'',
    descriptionEn: 'Fiberglass mat exterior sheathing panel. Moisture and wind resistant, used as substrate under exterior cladding.',
  },

  // ── Metal framing ─────────────────────────────────────────────────────────────
  'EB Metal Montant acier 25ga — 1-5/8" × 10\'': {
    nameEn: 'EB Metal Steel Stud 25ga — 1-5/8" × 10\'',
    descriptionEn: '25-gauge galvanized steel stud, 1-5/8" wide, 10 ft length. Used for lightweight non-load-bearing interior partitions.',
  },
  'EB Metal Montant acier 20ga — 1-5/8" × 10\'': {
    nameEn: 'EB Metal Steel Stud 20ga — 1-5/8" × 10\'',
    descriptionEn: '20-gauge galvanized steel stud, 1-5/8" wide. Increased strength for assemblies requiring greater rigidity.',
  },
  'EB Metal Montant acier 25ga — 2-1/2" × 10\'': {
    nameEn: 'EB Metal Steel Stud 25ga — 2-1/2" × 10\'',
    descriptionEn: '25-gauge galvanized stud, 2-1/2" wide. Standard format for interior partitions with thin insulation.',
  },
  'EB Metal Montant acier 20ga — 2-1/2" × 10\'': {
    nameEn: 'EB Metal Steel Stud 20ga — 2-1/2" × 10\'',
    descriptionEn: '20-gauge galvanized stud, 2-1/2" wide. Structural gauge for tall partitions or assemblies subject to lateral loads.',
  },
  'EB Metal Montant acier 25ga — 3-5/8" × 10\'': {
    nameEn: 'EB Metal Steel Stud 25ga — 3-5/8" × 10\'',
    descriptionEn: '25-gauge galvanized stud, 3-5/8" wide — the most common format in commercial construction. Compatible with R-12 2×4 insulation.',
  },
  'EB Metal Montant acier 25ga — 3-5/8" × 12\'': {
    nameEn: 'EB Metal Steel Stud 25ga — 3-5/8" × 12\'',
    descriptionEn: '3-5/8" stud in 12 ft length. For high-ceiling spaces without stud splicing.',
  },
  'EB Metal Montant acier 20ga — 3-5/8" × 10\'': {
    nameEn: 'EB Metal Steel Stud 20ga — 3-5/8" × 10\'',
    descriptionEn: '20-gauge galvanized stud, 3-5/8" wide. Robust for demanding commercial projects. Suitable for tall partitions.',
  },
  'EB Metal Montant acier 25ga — 6" × 10\'': {
    nameEn: 'EB Metal Steel Stud 25ga — 6" × 10\'',
    descriptionEn: '25-gauge galvanized stud, 6" wide. Used for exterior walls or assemblies requiring R-20 or greater insulation.',
  },
  'EB Metal Montant acier 20ga — 6" × 10\'': {
    nameEn: 'EB Metal Steel Stud 20ga — 6" × 10\'',
    descriptionEn: '20-gauge galvanized stud, 6" wide. High strength for perimeter walls with thick thermal insulation.',
  },
  'EB Metal Lisse (track) 25ga — 2-1/2" × 10\'': {
    nameEn: 'EB Metal Track 25ga — 2-1/2" × 10\'',
    descriptionEn: '25-gauge galvanized steel track, 2-1/2" wide, for floor and ceiling plates. Compatible with 2-1/2" studs.',
  },
  'EB Metal Lisse (track) 25ga — 3-5/8" × 10\'': {
    nameEn: 'EB Metal Track 25ga — 3-5/8" × 10\'',
    descriptionEn: '25-gauge galvanized track, 3-5/8" wide — the most widely used in commercial construction. Attached to concrete floor or wood framing.',
  },
  'EB Metal Lisse (track) 20ga — 3-5/8" × 10\'': {
    nameEn: 'EB Metal Track 20ga — 3-5/8" × 10\'',
    descriptionEn: '20-gauge galvanized track, 3-5/8" wide. Structural gauge recommended for tall-wall assemblies.',
  },
  'EB Metal Lisse (track) 25ga — 6" × 10\'': {
    nameEn: 'EB Metal Track 25ga — 6" × 10\'',
    descriptionEn: '25-gauge galvanized track, 6" wide, for thick insulation systems. Matches 6" studs.',
  },
  'EB Metal Fourrure résiliente RC-1 25ga × 12\'': {
    nameEn: 'EB Metal Resilient Channel RC-1 25ga × 12\'',
    descriptionEn: 'RC-1 resilient channel in 25-gauge steel. Improves STC acoustic isolation of partitions and ceilings by decoupling drywall from the framing.',
  },
  'EB Metal Canal chapeau (hat channel) 25ga × 10\'': {
    nameEn: 'EB Metal Hat Channel 25ga × 10\'',
    descriptionEn: '25-gauge galvanized hat channel, top-hat profile. Used for ceilings and as secondary furring.',
  },
  'EB Metal Cornière de plafond 20ga — 3-1/2"×3-1/2" × 10\'': {
    nameEn: 'EB Metal Ceiling Angle 20ga — 3-1/2"×3-1/2" × 10\'',
    descriptionEn: '20-gauge galvanized structural angle. Serves as perimeter for suspended ceilings and reinforcement in steel assemblies.',
  },
  'EB Metal Fourrure métallique 25ga — 7/8" × 12\'': {
    nameEn: 'EB Metal Metal Furring 25ga — 7/8" × 12\'',
    descriptionEn: '25-gauge galvanized metal furring, 7/8" wide, 12 ft length. Used for gypsum board ceilings and direct-attached ceiling assemblies.',
  },

  // ── Insulation ────────────────────────────────────────────────────────────────
  'Laine de verre R-12 — 2×4 16" — emb. 40 pi²': {
    nameEn: 'Fiberglass Batt R-12 — 2×4 16" — pkg. 40 sq. ft.',
    descriptionEn: 'R-12 fiberglass batt insulation, 15-1/4" wide for 16" o.c. framing. 40 sq. ft. package. Formaldehyde-free.',
  },
  'Laine de verre R-12 — 2×4 24" — emb. 40 pi²': {
    nameEn: 'Fiberglass Batt R-12 — 2×4 24" — pkg. 40 sq. ft.',
    descriptionEn: 'R-12 batt, 23-1/4" wide for 24" o.c. framing. 40 sq. ft. package. Cuts easily with a knife.',
  },
  'Laine de verre R-20 — 2×6 16" — emb. 40 pi²': {
    nameEn: 'Fiberglass Batt R-20 — 2×6 16" — pkg. 40 sq. ft.',
    descriptionEn: 'R-20 fiberglass batt for 2×6 framing at 16" o.c. 40 sq. ft. package. Applications: exterior walls, attic ceilings.',
  },
  'Laine de verre R-24 — Comble 16" — emb. 50 pi²': {
    nameEn: 'Fiberglass Attic Batt R-24 — 16" — pkg. 50 sq. ft.',
    descriptionEn: 'R-24 unfaced attic batt, 15-1/4" wide. 50 sq. ft. package. Perfect for upgrading attic insulation levels.',
  },
  'Panneau rigide EPS 1" — 4\'×8\'': {
    nameEn: 'EPS Rigid Foam Board 1" — 4\'×8\'',
    descriptionEn: 'Expanded polystyrene (EPS) insulation panel, 1" thick, R-4 value. Moisture resistant, lightweight and easy to cut. Applications: foundations, floors, walls.',
  },
  'Panneau rigide EPS 2" — 4\'×8\'': {
    nameEn: 'EPS Rigid Foam Board 2" — 4\'×8\'',
    descriptionEn: '2" EPS panel, R-8 value. Double layer possible to achieve R-16. Often used under slabs or as continuous wall insulation.',
  },
  'Panneau rigide XPS 1" — 4\'×8\'': {
    nameEn: 'XPS Rigid Foam Board 1" — 4\'×8\'',
    descriptionEn: 'Pink extruded polystyrene (XPS) panel, 1" thick, R-5 value. Better moisture and compression resistance vs. EPS. Ideal for foundations and slabs.',
  },
  'Panneau rigide XPS 2" — 4\'×8\'': {
    nameEn: 'XPS Rigid Foam Board 2" — 4\'×8\'',
    descriptionEn: '2" XPS panel, R-10 value. High thermal performance and moisture resistance for demanding building envelope projects.',
  },
  'Laine de roche acoustique — 2×4 16" — emb. 40 pi²': {
    nameEn: 'Acoustic Rockwool Batt — 2×4 16" — pkg. 40 sq. ft.',
    descriptionEn: 'High-density rockwool batt for acoustic attenuation. Improves partition STC by 6–8 points compared to fiberglass.',
  },
  'Laine de roche Rockwool Safe\'n\'Sound® 3" — 16" — emb. 40 pi²': {
    nameEn: 'Rockwool Safe\'n\'Sound® 3" — 16" — pkg. 40 sq. ft.',
    descriptionEn: '3" rockwool batt for floor and interior partition assemblies. STC 45–55. Non-combustible and mold resistant. 40 sq. ft. package.',
  },
  'Laine de roche Rockwool Comfortbatt® R-14 — 16"': {
    nameEn: 'Rockwool Comfortbatt® R-14 — 16"',
    descriptionEn: 'R-14 rockwool batt, 3-1/2" thick. Combines thermal and acoustic performance in one product. Fire, water and mold resistant.',
  },

  // ── Compounds & finishes ──────────────────────────────────────────────────────
  'CGC Sheetrock® Composé à joint prêt à l\'emploi — seau 20 kg': {
    nameEn: 'CGC Sheetrock® All-Purpose Joint Compound — 20 kg pail',
    descriptionEn: 'All-purpose ready-mixed joint compound for all 3 coats (tape, second, finish coat). 20 kg pail. Excellent adhesion, low shrinkage on drying.',
  },
  'CGC Sheetrock® Composé préfini — seau 18 L': {
    nameEn: 'CGC Sheetrock® Lightweight Finish Compound — 18 L pail',
    descriptionEn: 'Fine-texture finish compound for the finish coat. 18 L pail. Sands easily, guaranteed smooth surface.',
  },
  'CGC Durabond® 20 — composé à prise — sac 25 lb': {
    nameEn: 'CGC Durabond® 20 — Setting Compound — 25 lb bag',
    descriptionEn: 'Durabond 20 chemical-setting compound (sets in 20 min). Used for first coat taping of joints and crack repair. 25 lb powder bag.',
  },
  'CGC Durabond® 45 — composé à prise — sac 25 lb': {
    nameEn: 'CGC Durabond® 45 — Setting Compound — 25 lb bag',
    descriptionEn: 'Durabond 45 setting compound (sets in 45 min). More working time than Durabond 20. Ideal for extensive work and hot conditions.',
  },
  'CGC Durabond® 90 — composé à prise — sac 25 lb': {
    nameEn: 'CGC Durabond® 90 — Setting Compound — 25 lb bag',
    descriptionEn: 'Durabond 90 setting compound (sets in 90 min). Maximum open time in the Durabond range. Useful in cold conditions or for large surfaces.',
  },
  'CGC Imperial® Finish — enduit de finition — seau 18 L': {
    nameEn: 'CGC Imperial® Finish — Finishing Compound — 18 L pail',
    descriptionEn: 'Imperial® glaze finishing compound for textured ceilings and smooth finishes. 18 L pail. Improved resistance to scuffs and scratches.',
  },
  'CGC Sheetrock® Topping — composé de dessus — seau 18 L': {
    nameEn: 'CGC Sheetrock® Topping — Finish Compound — 18 L pail',
    descriptionEn: 'Ultra-smooth topping compound for the final finish coat. 18 L pail. Maximum reduction of sanding time for painted surfaces.',
  },
  'CGC Sheetrock® Composé en poudre — sac 40 lb': {
    nameEn: 'CGC Sheetrock® Powder Joint Compound — 40 lb bag',
    descriptionEn: 'Powder joint compound mixed with water. 40 lb bag. Long shelf life, more economical than ready-to-use products in large volumes.',
  },
  'CGC Sheetrock® Ease of Sanding — seau 4 L': {
    nameEn: 'CGC Sheetrock® Ease of Sanding — 4 L pail',
    descriptionEn: 'Easy-sand finish compound in small 4 L format. Ideal for touch-ups and small on-site finishing jobs.',
  },

  // ── Joint tape ────────────────────────────────────────────────────────────────
  'CGC Sheetrock® Bande de joint papier — 250\'': {
    nameEn: 'CGC Sheetrock® Paper Joint Tape — 250\'',
    descriptionEn: '250 ft embossed paper joint tape. Tear and moisture resistant during drying. Creates a thinner, stronger joint than fiberglass tape.',
  },
  'CGC Sheetrock® Bande de joint fibre de verre — 300\'': {
    nameEn: 'CGC Sheetrock® Fiberglass Mesh Joint Tape — 300\'',
    descriptionEn: '300 ft self-adhesive fiberglass mesh tape. Crack-resistant, ideal with Durabond setting compounds. No pre-embedding required.',
  },

  // ── Ceiling systems ───────────────────────────────────────────────────────────
  'Grille principale T-bar 15/16" — 12\'': {
    nameEn: 'Main T-bar Grid 15/16" — 12\'',
    descriptionEn: '15/16" face width galvanized steel main runner for 2×2 and 2×4 suspended ceiling grids. 12 ft length. Load capacity 10 lb/ft.',
  },
  'Grille secondaire T-bar 15/16" — 2\'': {
    nameEn: 'Cross T-bar 15/16" — 2\'',
    descriptionEn: '15/16" face width cross tee, 2 ft length. Completes the main runner for 2×2 ceiling modules.',
  },
  'Grille secondaire T-bar 15/16" — 4\'': {
    nameEn: 'Cross T-bar 15/16" — 4\'',
    descriptionEn: '15/16" face width cross tee, 4 ft length. For 2×4 ceiling modules. Quick tool-free clip-in installation.',
  },
  'Moulure périmètre L 1-1/2" × 1-1/2" — 12\'': {
    nameEn: 'Wall Angle Moulding L 1-1/2" × 1-1/2" — 12\'',
    descriptionEn: 'L-shaped perimeter moulding for suspended ceilings. Wall-mounted to receive the T-grid. 12 ft length. White painted finish.',
  },
  'Agrafe de suspension grille principale — sac 50': {
    nameEn: 'Main Runner Hanger Clip — bag of 50',
    descriptionEn: 'Galvanized clips to connect suspension wire to the main runner. Bag of 50. Quick slide-in installation with no tools.',
  },
  'Fil de suspension galvanisé 12ga — bobine 50\'': {
    nameEn: '12ga Galvanized Suspension Wire — 50\' coil',
    descriptionEn: '12-gauge galvanized steel wire, 50 ft coil. Used to hang T-bar ceiling grids from the structure. 50 lb load capacity per wire.',
  },

  // ── Corner beads & trim ───────────────────────────────────────────────────────
  'CGC Cornière métal galvanisée 3/4" × 3/4" — 8\'': {
    nameEn: 'CGC Galvanized Metal Corner Bead 3/4" × 3/4" — 8\'',
    descriptionEn: 'Galvanized metal corner bead 3/4" × 3/4", 8 ft length. Protects exposed drywall edges. Perforated for better compound adhesion.',
  },
  'CGC Cornière métal galvanisée 1-1/4" — 8\'': {
    nameEn: 'CGC Galvanized Metal Corner Bead 1-1/4" — 8\'',
    descriptionEn: 'Round-nose 1-1/4" metal corner bead, 8 ft length. For exposed edges at angles. Better impact resistance than 3/4" corner bead.',
  },
  'CGC Cornière PVC flexible — 8\'': {
    nameEn: 'CGC Flexible PVC Corner Bead — 8\'',
    descriptionEn: 'PVC corner bead for irregular angles and rounded corners. Flexible and rust-proof. 8 ft length.',
  },
  'CGC Moulure J 1/2" — 8\'': {
    nameEn: 'CGC J-Mould 1/2" — 8\'',
    descriptionEn: 'Galvanized metal J-mould for exposed edges of 1/2" drywall panels. 8 ft length. Clean finish at openings and panel terminations.',
  },
  'CGC Moulure J 5/8" — 8\'': {
    nameEn: 'CGC J-Mould 5/8" — 8\'',
    descriptionEn: 'Galvanized metal J-mould for 5/8" panels. 8 ft length.',
  },
  'CGC Moulure L 3/4" — 8\'': {
    nameEn: 'CGC L-Mould 3/4" — 8\'',
    descriptionEn: 'L-mould for the junction between drywall and another material (concrete, masonry). 8 ft length. Prevents cracking at dissimilar material joints.',
  },

  // ── Tools & fasteners ─────────────────────────────────────────────────────────
  'Vis à gypse phosphatée 6 × 1-1/4" — boîte 1000': {
    nameEn: 'Phosphate-Coated Drywall Screw #6 × 1-1/4" — box of 1000',
    descriptionEn: 'Fine-thread phosphate-coated drywall screw #6, 1-1/4" length. Box of 1000. For drywall on wood framing. Self-countersinking bugle head.',
  },
  'Vis à gypse phosphatée 6 × 1-5/8" — boîte 1000': {
    nameEn: 'Phosphate-Coated Drywall Screw #6 × 1-5/8" — box of 1000',
    descriptionEn: 'Fine-thread drywall screw #6, 1-5/8" length. Box of 1000. Most common format for 1/2" drywall on wood or steel framing.',
  },
  'Vis acier-acier S-12 7/16" — boîte 1000': {
    nameEn: 'S-12 Self-Drilling Screw 7/16" — box of 1000',
    descriptionEn: 'S-12 pan-head self-drilling screw, 7/16" for fastening galvanized steel up to 20ga. Box of 1000. Fast steel framing fastening.',
  },
  'Vis acier-acier S-12 1-1/4" — boîte 1000': {
    nameEn: 'S-12 Self-Drilling Screw 1-1/4" — box of 1000',
    descriptionEn: 'S-12 self-drilling screw, 1-1/4" for drywall on steel framing up to 20ga. Box of 1000. Fastens the panel and framing in one pass.',
  },
  'Vis acier-acier S-12 1-5/8" — boîte 1000': {
    nameEn: 'S-12 Self-Drilling Screw 1-5/8" — box of 1000',
    descriptionEn: 'S-12 self-drilling screw, 1-5/8" for 1/2" drywall on 25ga–20ga steel framing. Box of 1000. Standard format in commercial construction.',
  },
  'Couteau à gypse 6" — lame inox': {
    nameEn: '6" Drywall Finishing Knife — Stainless Steel Blade',
    descriptionEn: 'Professional 6" finishing knife with flexible stainless steel blade. Ergonomic handle. For applying the first coat of compound.',
  },
  'Couteau à gypse 10" — lame inox': {
    nameEn: '10" Drywall Finishing Knife — Stainless Steel Blade',
    descriptionEn: 'Professional 10" finishing knife with flexible stainless steel blade. Ideal for the second coat on wide surfaces. Non-slip handle.',
  },
  'Couteau à gypse 12" — lame inox': {
    nameEn: '12" Drywall Finishing Knife — Stainless Steel Blade',
    descriptionEn: 'Extra-wide 12" finishing knife for the final coat. Covers large surfaces with fewer passes. Flexible stainless steel blade.',
  },
  'Bac à composé galvanisé — 14"': {
    nameEn: 'Galvanized Compound Tray — 14"',
    descriptionEn: '14" galvanized compound tray with steel edge for cleaning the knife. Holds enough compound for a long surface run.',
  },
  'Truelle d\'angle intérieur — 4"': {
    nameEn: 'Inside Corner Tool — 4"',
    descriptionEn: '4" per side stainless steel inside corner tool. For perfect inside corners in one pass. Essential for drywall finishers.',
  },

  // ── Acoustics ─────────────────────────────────────────────────────────────────
  'Découplement de montant acoustique — emb. 50': {
    nameEn: 'Acoustic Stud Isolator — pkg. of 50',
    descriptionEn: 'EPDM vibration isolator attached to steel studs before drywall installation. Reduces sound transmission by decoupling framing from cladding. Package of 50.',
  },
  'Scellant acoustique Acoustik® — cartouche 825 ml': {
    nameEn: 'Acoustik® Acoustic Sealant — 825 ml cartridge',
    descriptionEn: 'Permanent water-based sealant for sealing joints in acoustic partition assemblies. 825 ml cartridge. Stays flexible, does not harden.',
  },
  'Membrane acoustique résiliente IsoStep® — rouleau 100 pi²': {
    nameEn: 'IsoStep® Resilient Acoustic Membrane — 100 sq. ft. roll',
    descriptionEn: '3mm recycled rubber resilient underlayment. Attenuates impact noise. 100 sq. ft. roll. IIC Delta +19.',
  },
}

async function main() {
  console.log('Starting translations...\n')

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = await prisma.category.findMany()
  let catUpdated = 0
  for (const cat of categories) {
    const nameEn = CATEGORY_TRANSLATIONS[cat.name]
    if (nameEn) {
      await prisma.category.update({ where: { id: cat.id }, data: { nameEn } })
      console.log(`  CAT: ${cat.name} → ${nameEn}`)
      catUpdated++
    } else {
      console.warn(`  CAT [NO TRANSLATION]: ${cat.name}`)
    }
  }
  console.log(`\n✓ ${catUpdated}/${categories.length} categories translated.\n`)

  // ── Products ────────────────────────────────────────────────────────────────
  const products = await prisma.product.findMany({ select: { id: true, name: true } })
  let prodUpdated = 0
  let prodMissed = 0
  for (const p of products) {
    const tr = PRODUCT_TRANSLATIONS[p.name]
    if (tr) {
      await prisma.product.update({
        where: { id: p.id },
        data: { nameEn: tr.nameEn, descriptionEn: tr.descriptionEn },
      })
      console.log(`  PROD: ${p.name.slice(0, 50)}`)
      prodUpdated++
    } else {
      console.warn(`  PROD [NO TRANSLATION]: ${p.name}`)
      prodMissed++
    }
  }

  console.log(`\n✓ ${prodUpdated}/${products.length} products translated.`)
  if (prodMissed > 0) console.warn(`⚠ ${prodMissed} products had no translation entry.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
