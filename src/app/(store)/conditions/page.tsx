export const metadata = { title: 'Conditions générales de vente — DSF' }

export default function ConditionsPage() {
  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '5rem', maxWidth: 800 }}>
      <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-dark)', marginBottom: '0.6rem' }}>
        Conditions générales de vente
      </h1>
      <div style={{ width: 56, height: 4, backgroundColor: 'var(--brand-primary)', marginBottom: '2.5rem' }} />

      {[
        {
          title: '1. Objet',
          body: `Les présentes conditions générales de vente (CGV) régissent l'ensemble des transactions réalisées sur la plateforme en ligne de Distribution Ste-Foy (DSF). Toute commande passée sur ce site implique l'acceptation pleine et entière des présentes CGV.`,
        },
        {
          title: '2. Produits et disponibilité',
          body: `Les produits présentés sur le site sont décrits avec la plus grande précision possible. DSF se réserve le droit de modifier son catalogue à tout moment. Les disponibilités sont mises à jour en temps réel via la synchronisation avec Microsoft Business Central.`,
        },
        {
          title: '3. Prix',
          body: `Les prix sont affichés en dollars canadiens (CAD) et incluent les taxes applicables, sauf mention contraire. Les clients B2B bénéficient de tarifs personnalisés selon leur entente commerciale. DSF se réserve le droit de modifier ses prix à tout moment.`,
        },
        {
          title: '4. Commandes',
          body: `Toute commande est ferme après validation du paiement. En cas de rupture de stock survenant après la commande, DSF contactera le client dans les 24 heures ouvrables pour proposer un produit de remplacement ou un remboursement complet.`,
        },
        {
          title: '5. Paiement',
          body: `Le paiement est sécurisé par Stripe (conforme PCI-DSS). Les informations bancaires ne sont jamais stockées sur les serveurs de DSF. Les paiements acceptés incluent les cartes Visa, Mastercard et American Express.`,
        },
        {
          title: '6. Livraison',
          body: `Les délais et frais de livraison sont communiqués lors de la commande. DSF n'est pas responsable des retards causés par des tiers transporteurs ou des événements hors de son contrôle.`,
        },
        {
          title: '7. Retours et remboursements',
          body: `Tout retour doit être autorisé par DSF dans les 30 jours suivant la réception. Les produits doivent être retournés dans leur emballage d'origine, non utilisés. Les retours autorisés sont remboursés dans un délai de 10 jours ouvrables.`,
        },
        {
          title: '8. Responsabilité',
          body: `DSF ne peut être tenu responsable de dommages indirects résultant de l'utilisation de ses produits. La responsabilité de DSF est limitée au montant de la commande concernée.`,
        },
        {
          title: '9. Données personnelles',
          body: `Les données personnelles collectées sont utilisées uniquement pour le traitement des commandes et la relation client, conformément à la Loi 25 (Québec) et au RGPD. Elles ne sont jamais vendues à des tiers.`,
        },
        {
          title: '10. Droit applicable',
          body: `Les présentes CGV sont soumises au droit québécois. Tout litige sera soumis à la juridiction exclusive des tribunaux de la province de Québec, Canada.`,
        },
      ].map((section) => (
        <div key={section.title} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brand-dark)', marginBottom: '0.5rem' }}>
            {section.title}
          </h2>
          <p style={{ fontSize: '0.9rem', fontWeight: 300, color: '#4b5563', lineHeight: 1.9 }}>
            {section.body}
          </p>
        </div>
      ))}

      <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '3rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
        Dernière mise à jour : {new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  )
}
