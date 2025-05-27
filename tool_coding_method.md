
# Easy Genie: Méthode de Développement des Outils

Ce document décrit l'approche standardisée pour le développement de nouveaux outils au sein de l'application Easy Genie. L'objectif est d'assurer la cohérence du design, la maintenabilité du code et une expérience utilisateur homogène.

## 1. Structure des Fichiers

Chaque nouvel outil devrait idéalement suivre cette structure :

- **Page Route**: `src/app/nom-de-l-outil/page.tsx`
  - Contient le composant principal de l'outil et les métadonnées de la page.
  - Devrait être un Server Component simple qui importe le composant client de l'outil.
- **Composant Principal de l'Outil**: `src/components/tools/nom-de-l-outil-tool.tsx`
  - Fichier `"use client";`.
  - Gère la logique, l'état et l'UI de l'outil.
  - Importe et utilise `IntensitySelector`.
  - Intègre la logique pour la saisie vocale et les appels aux flux Genkit AI.
- **Flux Genkit AI (si applicable)**: `src/ai/flows/nom-du-flux-flow.ts`
  - Fichier `"use server";`.
  - Définit les schémas d'entrée/sortie Zod.
  - Implémente la logique du prompt et du flux avec Genkit.
  - Exporte la fonction principale du flux et ses types d'entrée/sortie.
  - Doit être importé dans `src/ai/dev.ts` pour l'enregistrement.
- **Types Spécifiques (si nécessaire)**: Définis dans `src/types/index.ts` si réutilisables, sinon localement dans le composant de l'outil s'ils sont très spécifiques.

## 2. Conception des Composants

- **ShadCN UI & Tailwind CSS**: Utiliser prioritairement les composants de ShadCN UI (`@/components/ui/*`) et Tailwind CSS pour le style.
- **Props & État**:
  - Les composants doivent être aussi autonomes que possible.
  - L'état principal de l'outil est géré localement dans le composant de l'outil (ex: `useState`).
  - Pour la persistance des données utilisateur (non authentifié), utiliser `localStorage`.
- **Modularité**:
  - Créer des sous-composants si une partie de l'UI devient complexe et est réutilisable ou si cela améliore la lisibilité.
  - Le composant `IntensitySelector` est un exemple de composant réutilisable.
- **Accessibilité**: Utiliser les attributs ARIA lorsque c'est pertinent et s'assurer de la navigabilité au clavier.

## 3. Intégration de l'IA (Genkit)

- **Un Flux par Fichier**: Chaque flux Genkit doit résider dans son propre fichier dans `src/ai/flows/`.
- **Schémas Zod**: Toujours définir des schémas Zod clairs pour les entrées (`InputSchema`) et les sorties (`OutputSchema`) des flux. Exporter les types TypeScript inférés de ces schémas.
- **Fonction Wrapper Exportée**: Exporter une fonction `async` simple qui prend l'input validé et appelle le flux Genkit. C'est cette fonction qui sera appelée depuis les composants React.
- **Impact de l'Intensité**:
  - L'objet `input` du flux doit inclure `intensityLevel: z.number().min(1).max(5)`.
  - Le prompt doit explicitement guider le LLM sur la manière d'adapter sa réponse en fonction de `intensityLevel`. Fournir des exemples clairs pour chaque niveau ou plage de niveaux.
- **Gestion des Erreurs**: Les appels aux flux depuis les composants React doivent être enveloppés dans des blocs `try...catch` pour gérer les erreurs potentielles de l'API.
- **État de Chargement**: Implémenter un état de chargement (`isLoading`) dans le composant React pour fournir un retour visuel à l'utilisateur pendant l'appel AI.
- **Configuration de Sécurité**: Définir des `safetySettings` appropriés dans la configuration du prompt Genkit.

## 4. Saisie Vocale (Web Speech API)

- **Initialisation**:
  - Utiliser `useRef` pour stocker l'instance de `SpeechRecognition`.
  - Initialiser dans un `useEffect` (une seule fois au montage).
  - Vérifier la compatibilité du navigateur (`window.SpeechRecognition || window.webkitSpeechRecognition`).
- **Gestion de l'État**:
  - `isListening: boolean` pour contrôler l'état de l'écoute.
  - `activeMicField: string | null` (ou un type plus spécifique) pour gérer plusieurs champs de saisie vocale sur une même page.
- **Callbacks**:
  - `onresult`: Mettre à jour l'état du champ de texte correspondant avec le `transcript`.
  - `onerror`: Afficher un toast d'erreur.
  - `onend`: Réinitialiser `isListening` et `activeMicField`.
- **Interface Utilisateur**:
  - Un bouton avec une icône `Mic` (`lucide-react`).
  - L'icône doit changer d'apparence (ex: couleur, animation) lorsque l'écoute est active.
  - Le bouton doit être désactivé si la saisie vocale n'est pas supportée ou si un autre champ est en cours d'écoute.
- **Permissions**: La première utilisation demandera la permission du microphone au navigateur. Aucune gestion explicite des permissions n'est requise dans le code au-delà de la gestion des erreurs si l'API échoue.

## 5. Style et UI/UX

- **Cohérence Thématique**: Respecter le thème global "Easy Genie" (magie, simplicité, assistance). Utiliser les couleurs et polices définies dans `src/app/globals.css` et `tailwind.config.ts`.
- **Icônes**: Utiliser `lucide-react` pour les icônes.
- **Feedback Utilisateur**:
  - Utiliser `useToast` pour les notifications (succès, erreur, information).
  - Afficher des états de chargement clairs (ex: `Loader2` de `lucide-react` sur les boutons).
  - Désactiver les boutons pendant les opérations asynchrones.
- **Responsive Design**: S'assurer que les outils sont utilisables sur différentes tailles d'écran.

## 6. Gestion de l'État et Persistance

- **État Local**: `useState` pour l'état interne des composants.
- **`localStorage`**: Pour la persistance des données des outils pour les utilisateurs non authentifiés (ex: tâches, contenu de brain dump, routines). Utiliser des clés de stockage distinctes par outil (ex: `easyGenieTaskBreakerData`).
  - Charger les données depuis `localStorage` dans un `useEffect` au montage du composant.
  - Sauvegarder les données dans `localStorage` à chaque modification pertinente.

## 7. Tests (Futur)

- Bien que non implémentés initialement, concevoir les composants et fonctions de manière à faciliter les tests unitaires et d'intégration futurs.

## 8. Changelog

- Mettre à jour `changelog.md` après chaque ajout ou modification significative d'un outil.

En suivant ces directives, nous pouvons construire une suite d'outils cohérente, robuste et agréable à utiliser.
