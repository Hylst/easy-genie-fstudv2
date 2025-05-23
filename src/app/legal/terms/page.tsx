import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions d\'Utilisation | Easy Genie',
  description: 'Consultez nos conditions d\'utilisation.',
};

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto py-12 px-4 prose dark:prose-invert max-w-3xl">
      <h1>Conditions d'Utilisation</h1>
      <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

      <h2>1. Accord avec les Conditions</h2>
      <p>En accédant ou en utilisant notre site web Easy Genie (le "Service"), vous acceptez d'être lié par ces Conditions d'Utilisation ("Conditions"). Si vous n'êtes pas d'accord avec une partie des conditions, vous ne pouvez pas accéder au Service.</p>

      <h2>2. Utilisation du Service</h2>
      <p>Easy Genie fournit une suite d'outils web minimalistes. Vous acceptez d'utiliser le Service uniquement à des fins légales et conformément à ces Conditions.</p>
      <p>Vous êtes responsable de la sauvegarde de vos données, en particulier si vous utilisez le Service sans compte où les données sont stockées localement.</p>

      <h2>3. Comptes Utilisateurs (Fonctionnalité Future)</h2>
      <p>Lorsque vous créez un compte chez nous, vous devez nous fournir des informations exactes, complètes et à jour en tout temps. Le non-respect de cette obligation constitue une violation des Conditions, ce qui peut entraîner la résiliation immédiate de votre compte sur notre Service.</p>
      <p>Vous êtes responsable de la protection du mot de passe que vous utilisez pour accéder au Service et de toutes activités ou actions sous votre mot de passe.</p>

      <h2>4. Propriété Intellectuelle</h2>
      <p>Le Service et son contenu original (à l'exclusion du contenu fourni par les utilisateurs), ses caractéristiques et ses fonctionnalités sont et resteront la propriété exclusive de Easy Genie et de ses concédants de licence.</p>

      <h2>5. Limitation de Responsabilité</h2>
      <p>Dans toute la mesure permise par la loi applicable, en aucun cas Easy Genie, ni ses administrateurs, employés, partenaires, agents, fournisseurs ou affiliés, ne pourront être tenus responsables de tout dommage indirect, accessoire, spécial, consécutif ou punitif, y compris, sans limitation, la perte de profits, de données, d'utilisation, de clientèle ou d'autres pertes incorporelles, résultant de (i) votre accès ou utilisation ou incapacité d'accéder ou d'utiliser le Service ; (ii) toute conduite ou contenu d'un tiers sur le Service ; (iii) tout contenu obtenu à partir du Service ; et (iv) l'accès, l'utilisation ou l'altération non autorisés de vos-transmissions ou de votre contenu, que ce soit sur la base d'une garantie, d'un contrat, d'un délit (y compris la négligence) ou de toute autre théorie juridique, que nous ayons été informés ou non de la possibilité de tels dommages, et même si un recours énoncé dans les présentes s'avère avoir échoué dans son objectif essentiel.</p>

      <h2>6. Modifications</h2>
      <p>Nous nous réservons le droit, à notre seule discrétion, de modifier ou de remplacer ces Conditions à tout moment. Si une révision est importante, nous essaierons de fournir un préavis d'au moins 30 jours avant l'entrée en vigueur des nouvelles conditions. Ce qui constitue un changement important sera déterminé à notre seule discrétion.</p>

      <h2>7. Nous Contacter</h2>
      <p>Si vous avez des questions concernant ces Conditions, veuillez nous contacter à [adresse e-mail de contact à ajouter].</p>
    </div>
  );
}
