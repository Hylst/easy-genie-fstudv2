import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité | Easy Genie',
  description: 'Consultez notre politique de confidentialité.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto py-12 px-4 prose dark:prose-invert max-w-3xl">
      <h1>Politique de Confidentialité</h1>
      <p>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
      
      <h2>1. Introduction</h2>
      <p>Bienvenue sur Easy Genie. Nous respectons votre vie privée et nous nous engageons à protéger vos données personnelles. Cette politique de confidentialité vous informera sur la manière dont nous traitons vos données personnelles lorsque vous visitez notre site web (quel que soit l'endroit d'où vous le visitez) et vous informera de vos droits en matière de confidentialité et de la manière dont la loi vous protège.</p>

      <h2>2. Données que nous collectons</h2>
      <p>Nous pouvons collecter, utiliser, stocker et transférer différents types de données personnelles vous concernant que nous avons regroupées comme suit :</p>
      <ul>
        <li><strong>Données d'identité</strong> : prénom, nom d'utilisateur ou identifiant similaire.</li>
        <li><strong>Données de contact</strong> : adresse e-mail.</li>
        <li><strong>Données techniques</strong> : adresse de protocole Internet (IP), vos données de connexion, type et version du navigateur, réglage du fuseau horaire et emplacement, types et versions de plug-in de navigateur, système d'exploitation et plate-forme, et autres technologies sur les appareils que vous utilisez pour accéder à ce site web.</li>
        <li><strong>Données d'utilisation</strong> : informations sur la manière dont vous utilisez notre site web et nos services.</li>
        <li><strong>Données utilisateur des outils</strong> : les données que vous saisissez dans nos outils (par exemple, listes de tâches, notes). Si vous n'êtes pas connecté, ces données sont stockées localement dans votre navigateur. Si vous êtes connecté, ces données peuvent être stockées sur nos serveurs pour permettre la synchronisation.</li>
      </ul>

      <h2>3. Comment nous utilisons vos données personnelles</h2>
      <p>Nous n'utiliserons vos données personnelles que lorsque la loi nous le permettra. Le plus souvent, nous utiliserons vos données personnelles dans les circonstances suivantes :</p>
      <ul>
        <li>Pour vous fournir et maintenir notre service.</li>
        <li>Pour gérer votre compte (si applicable).</li>
        <li>Pour améliorer notre site web et nos services.</li>
        <li>Pour communiquer avec vous.</li>
      </ul>

      <h2>4. Stockage des données</h2>
      <p>Pour les utilisateurs non connectés, les données saisies dans les outils sont stockées localement dans votre navigateur via localStorage. Ces données ne sont pas transmises à nos serveurs.</p>
      <p>Pour les utilisateurs connectés (fonctionnalité future), les données peuvent être stockées sur nos serveurs sécurisés (par exemple, via Supabase) pour permettre la synchronisation entre appareils.</p>

      <h2>5. Vos droits légaux</h2>
      <p>Dans certaines circonstances, vous disposez de droits en vertu des lois sur la protection des données concernant vos données personnelles. Ceux-ci incluent le droit de :</p>
      <ul>
        <li>Demander l'accès à vos données personnelles.</li>
        <li>Demander la correction de vos données personnelles.</li>
        <li>Demander la suppression de vos données personnelles.</li>
        <li>Vous opposer au traitement de vos données personnelles.</li>
        <li>Demander la restriction du traitement de vos données personnelles.</li>
        <li>Demander le transfert de vos données personnelles.</li>
        <li>Droit de retirer votre consentement.</li>
      </ul>

      <h2>6. Modifications de cette politique de confidentialité</h2>
      <p>Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. Nous vous informerons de tout changement en publiant la nouvelle politique de confidentialité sur cette page.</p>

      <h2>7. Nous contacter</h2>
      <p>Si vous avez des questions concernant cette politique de confidentialité, veuillez nous contacter à [adresse e-mail de contact à ajouter].</p>
    </div>
  );
}
