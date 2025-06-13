
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { CheckSquare, Square, Trash2, PlusCircle, Wand2, Mic, Loader2, ChevronDown, ChevronRight, Download, Mail, History, ListChecks, Save, BookOpenCheck, Eraser, BookmarkPlus, Info, BrainCircuit, Sparkles, TimerIcon, ClockIcon, Edit3 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { breakdownTask, type BreakdownTaskOutput } from '@/ai/flows/breakdown-task-flow';
import type { UITaskBreakerTask, TaskBreakerCustomPreset, CreateTaskBreakerCustomPresetDTO, TaskBreakerSavedBreakdown, CreateTaskBreakerSavedBreakdownDTO, CreateTaskBreakerTaskDTO, TaskSuggestionPreset, PreDecomposedTaskPreset, PreDecomposedTaskSubTask, TaskBreakerTask } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  getAllTaskBreakerTasks,
  addTaskBreakerTask,
  updateTaskBreakerTask,
  deleteTaskBreakerTask,
  getAllTaskBreakerCustomPresets,
  addTaskBreakerCustomPreset,
  deleteTaskBreakerCustomPreset,
  getAllTaskBreakerSavedBreakdowns,
  addTaskBreakerSavedBreakdown,
  deleteTaskBreakerSavedBreakdown,
} from '@/services/appDataService';


const TASK_BREAKER_EXPANDED_STATE_KEY = "easyGenieTaskBreakerExpandedState_v1";
const TASK_BREAKER_MODE_KEY = "easyGenieTaskBreakerMode_v1";
const TASK_BREAKER_TIME_ESTIMATES_ENABLED_KEY = "easyGenieTaskBreakerTimeEstimatesEnabled_v1";


const systemTaskSuggestions: TaskSuggestionPreset[] = [
  // Personnel & Bien-être
  { id: 'sugg_pers_1', name: "Planifier des vacances relaxantes", taskText: "Planifier des vacances relaxantes et ressourçantes", category: "Personnel & Bien-être" },
  { id: 'sugg_pers_2', name: "Organiser une routine sportive", taskText: "Organiser une routine sportive hebdomadaire équilibrée", category: "Personnel & Bien-être" },
  { id: 'sugg_pers_3', name: "Préparer les repas de la semaine", taskText: "Préparer tous les repas sains pour la semaine (meal prep)", category: "Personnel & Bien-être" },
  { id: 'sugg_pers_4', name: "Apprendre une recette complexe", taskText: "Apprendre et maîtriser une nouvelle recette de cuisine complexe", category: "Personnel & Bien-être" },
  { id: 'sugg_pers_5', name: "Réorganiser une pièce de la maison", taskText: "Réorganiser et optimiser l'espace d'une pièce de la maison", category: "Personnel & Bien-être" },
  { id: 'sugg_pers_6', name: "Fixer des objectifs personnels", taskText: "Fixer des objectifs personnels clairs pour le prochain trimestre", category: "Personnel & Bien-être" },
  { id: 'sugg_pers_7', name: "Organiser une fête surprise", taskText: "Organiser une fête d'anniversaire surprise pour un proche", category: "Personnel & Bien-être" },
  { id: 'sugg_pers_8', name: "Faire le tri et désencombrer", taskText: "Faire un grand tri dans ses affaires et donner/vendre l'inutile", category: "Personnel & Bien-être" },
  // Professionnel & Productivité
  { id: 'sugg_pro_1', name: "Préparer une présentation client", taskText: "Préparer une présentation client impactante et convaincante", category: "Professionnel & Productivité" },
  { id: 'sugg_pro_2', name: "Rédiger un rapport détaillé", taskText: "Rédiger un rapport de recherche ou d'analyse approfondi", category: "Professionnel & Productivité" },
  { id: 'sugg_pro_3', name: "Organiser sa boîte mail", taskText: "Organiser sa boîte de réception email et ses dossiers numériques", category: "Professionnel & Productivité" },
  { id: 'sugg_pro_4', name: "Mettre en place une stratégie marketing", taskText: "Mettre en place une nouvelle stratégie marketing digitale", category: "Professionnel & Productivité" },
  { id: 'sugg_pro_5', name: "Rechercher un nouvel emploi", taskText: "Rechercher activement et postuler à de nouvelles opportunités professionnelles", category: "Professionnel & Productivité" },
  { id: 'sugg_pro_6', name: "Préparer un entretien d'embauche", taskText: "Préparer minutieusement un entretien d'embauche important", category: "Professionnel & Productivité" },
  { id: 'sugg_pro_7', name: "Développer un nouveau produit/service", taskText: "Développer un prototype pour un nouveau produit ou service", category: "Professionnel & Productivité" },
  { id: 'sugg_pro_8', name: "Organiser une réunion d'équipe", taskText: "Organiser et animer une réunion d'équipe productive et engageante", category: "Professionnel & Productivité" },
  // Projets & Créativité
  { id: 'sugg_crea_1', name: "Écrire un chapitre de roman", taskText: "Écrire et finaliser un chapitre de son roman en cours", category: "Projets & Créativité" },
  { id: 'sugg_crea_2', name: "Créer une série de peintures", taskText: "Créer une série de trois peintures sur un thème commun", category: "Projets & Créativité" },
  { id: 'sugg_crea_3', name: "Apprendre un morceau de musique", taskText: "Apprendre à jouer un nouveau morceau de musique complexe à son instrument", category: "Projets & Créativité" },
  { id: 'sugg_crea_4', name: "Réaliser un court-métrage", taskText: "Réaliser un court-métrage de A à Z (scénario, tournage, montage)", category: "Projets & Créativité" },
  { id: 'sugg_crea_5', name: "Lancer un podcast", taskText: "Lancer son propre podcast (concept, matériel, premier épisode)", category: "Projets & Créativité" },
  { id: 'sugg_crea_6', name: "Construire un meuble DIY", taskText: "Construire un meuble personnalisé en suivant un tutoriel DIY", category: "Projets & Créativité" },
  // Apprentissage & Développement
  { id: 'sugg_app_1', name: "Apprendre une langue étrangère (bases)", taskText: "Apprendre les bases d'une nouvelle langue étrangère (salutations, chiffres, phrases utiles)", category: "Apprentissage & Développement" },
  { id: 'sugg_app_2', name: "Suivre un cours en ligne", taskText: "Suivre et compléter un cours en ligne sur un sujet d'intérêt", category: "Apprentissage & Développement" },
  { id: 'sugg_app_3', name: "Lire 5 livres sur un thème", taskText: "Lire et prendre des notes sur cinq livres traitant d'un même sujet", category: "Apprentissage & Développement" },
  { id: 'sugg_app_4', name: "Obtenir une certification", taskText: "Se préparer et passer un examen pour une certification professionnelle", category: "Apprentissage & Développement" },
  // Organisation & Administratif
  { id: 'sugg_org_1', name: "Faire sa déclaration d'impôts", taskText: "Rassembler les documents et remplir sa déclaration d'impôts", category: "Organisation & Administratif" },
  { id: 'sugg_org_2', name: "Organiser ses documents administratifs", taskText: "Organiser et classer tous ses documents administratifs importants", category: "Organisation & Administratif" },
  { id: 'sugg_org_3', name: "Planifier un déménagement", taskText: "Planifier toutes les étapes d'un déménagement", category: "Organisation & Administratif" },
  { id: 'sugg_org_4', name: "Mettre en place un budget", taskText: "Mettre en place un budget mensuel et un plan d'épargne", category: "Organisation & Administratif" },
];

const preDecomposedTaskPresets: PreDecomposedTaskPreset[] = [
    // Gestion de Projet
    { id: 'pd_gp_1', name: "Lancer un site web vitrine", mainTaskText: "Lancer un nouveau site web vitrine pour une petite entreprise", category: "Gestion de Projet", subTasks: [
        { text: "Phase 1: Planification et Conception", subTasks: [
            { text: "Définir les objectifs, le public cible et les fonctionnalités clés" },
            { text: "Rechercher des inspirations et analyser la concurrence" },
            { text: "Choisir la technologie (CMS, framework) et l'hébergeur" },
            { text: "Créer l'arborescence du site et les wireframes des pages principales" },
            { text: "Concevoir la charte graphique (logo, couleurs, typographies)" },
        ]},
        { text: "Phase 2: Développement et Contenu", subTasks: [
            { text: "Configurer l'environnement de développement et l'hébergement" },
            { text: "Développer le template ou thème du site" },
            { text: "Intégrer les maquettes graphiques" },
            { text: "Rédiger ou collecter le contenu textuel pour chaque page (Accueil, À propos, Services, Contact)" },
            { text: "Optimiser les images et autres médias pour le web" },
            { text: "Implémenter le formulaire de contact et autres fonctionnalités interactives" },
        ]},
        { text: "Phase 3: Test, Lancement et Suivi", subTasks: [
            { text: "Tester la responsivité sur différents appareils (desktop, tablette, mobile)" },
            { text: "Vérifier la compatibilité avec les principaux navigateurs" },
            { text: "Effectuer des tests de performance (vitesse de chargement)" },
            { text: "Relire et corriger tout le contenu" },
            { text: "Configurer Google Analytics et Google Search Console" },
            { text: "Mettre le site en ligne" },
            { text: "Annoncer le lancement et prévoir une maintenance initiale" },
        ]},
    ]},
    { id: 'pd_gp_2', name: "Organiser une campagne marketing", mainTaskText: "Organiser une campagne marketing trimestrielle pour un nouveau produit", category: "Gestion de Projet", subTasks: [
      { text: "Définition de la stratégie", subTasks: [
          { text: "Analyser les performances des campagnes précédentes" },
          { text: "Fixer les objectifs SMART (Spécifiques, Mesurables, Atteignables, Réalistes, Temporellement définis) et les KPIs" },
          { text: "Identifier l'audience cible et les personas" },
          { text: "Choisir les canaux de diffusion prioritaires (réseaux sociaux, email, SEA, etc.)" },
          { text: "Définir le budget global de la campagne" },
      ]},
      { text: "Création du contenu", subTasks: [
          { text: "Brainstorming créatif et définition des messages clés" },
          { text: "Rédaction des textes publicitaires et des articles de blog" },
          { text: "Création des visuels (images, vidéos, infographies)" },
          { text: "Conception des landing pages si nécessaire" },
          { text: "Obtenir les validations internes pour tout le contenu" },
      ]},
      { text: "Lancement et suivi", subTasks: [
          { text: "Planifier le calendrier éditorial et de publication" },
          { text: "Configurer les outils de tracking et d'analyse" },
          { text: "Lancer la campagne sur les différents canaux" },
          { text: "Monitorer les performances en temps réel et optimiser si besoin" },
          { text: "Gérer les interactions et les commentaires de l'audience" },
          { text: "Compiler les données et rédiger le rapport final de campagne" },
      ]},
    ]},
    // Événementiel
    { id: 'pd_evt_1', name: "Organiser un webinaire", mainTaskText: "Organiser un webinaire de lancement pour un nouveau service", category: "Événementiel", subTasks: [
      { text: "Préparation en Amont (J-30 à J-7)", subTasks: [
          { text: "Définir le sujet précis, les objectifs et le public cible du webinaire" },
          { text: "Choisir la date, l'heure et la durée" },
          { text: "Sélectionner et configurer la plateforme de webinaire (Zoom, Teams, Livestorm)" },
          { text: "Préparer le contenu de la présentation (slides, démos)" },
          { text: "Inviter et coordonner les intervenants (si plusieurs)" },
          { text: "Créer la page d'inscription et le formulaire" },
      ]},
      { text: "Promotion et Inscriptions (J-15 à J-1)", subTasks: [
          { text: "Rédiger et envoyer les emails d'invitation" },
          { text: "Promouvoir sur les réseaux sociaux et autres canaux pertinents" },
          { text: "Mettre en place des emails de confirmation et de rappel automatiques" },
          { text: "Suivre le nombre d'inscrits et relancer si nécessaire" },
      ]},
      { text: "Jour J et Suivi (J0 à J+7)", subTasks: [
          { text: "Effectuer un test technique final (audio, vidéo, partage d'écran)" },
          { text: "Accueillir les participants et animer le webinaire" },
          { text: "Gérer les questions/réponses et l'interaction" },
          { text: "Enregistrer le webinaire" },
          { text: "Envoyer un email de remerciement avec l'enregistrement et les ressources" },
          { text: "Analyser les statistiques de participation et les feedbacks" },
      ]},
    ]},
    { id: 'pd_evt_2', name: "Planifier une conférence interne", mainTaskText: "Planifier une petite conférence interne d'une journée", category: "Événementiel", subTasks: [
        { text: "Définition et Organisation Initiale", subTasks: [
            { text: "Clarifier les objectifs de la conférence et le public cible interne." },
            { text: "Fixer une date et une durée (ex: une journée complète)." },
            { text: "Établir un budget prévisionnel (location de salle, traiteur, matériel, etc.)." },
            { text: "Réserver un lieu adapté ou une plateforme virtuelle si nécessaire." },
        ]},
        { text: "Contenu et Intervenants", subTasks: [
            { text: "Définir le thème principal et les sous-thèmes des sessions." },
            { text: "Identifier et inviter les intervenants (internes et/ou externes)." },
            { text: "Élaborer l'agenda détaillé des présentations et des pauses." },
            { text: "Collecter et vérifier les supports de présentation des intervenants." },
        ]},
        { text: "Logistique et Communication", subTasks: [
            { text: "Gérer les inscriptions des participants." },
            { text: "Organiser la logistique (traiteur pour les pauses et déjeuner, matériel audiovisuel, signalétique)." },
            { text: "Communiquer régulièrement avec les participants (agenda, informations pratiques)." },
            { text: "Préparer les badges et les documents à distribuer." },
        ]},
        { text: "Jour J et Post-Événement", subTasks: [
            { text: "Coordonner l'accueil des participants et des intervenants." },
            { text: "Assurer le bon déroulement technique et logistique de la journée." },
            { text: "Animer les sessions de questions-réponses et les moments de networking." },
            { text: "Recueillir les feedbacks des participants via un questionnaire de satisfaction." },
            { text: "Partager les présentations et un résumé de la conférence après l'événement." },
        ]},
    ]},
    // Développement Personnel
    { id: 'pd_devperso_1', name: "Apprendre une nouvelle langue (A1)", mainTaskText: "Atteindre le niveau A1 dans une nouvelle langue en 3 mois", category: "Développement Personnel", subTasks: [
      { text: "Mise en Place et Planification (Semaine 1)", subTasks: [
          { text: "Choisir la langue cible et rechercher des ressources d'apprentissage (applications, cours en ligne, manuels)." },
          { text: "Fixer des objectifs d'étude hebdomadaires clairs et réalisables (ex: nombre d'heures, leçons à couvrir)." },
          { text: "Établir un planning d'étude régulier et l'intégrer à son agenda." },
          { text: "Se familiariser avec l'alphabet, la prononciation de base et les salutations." },
      ]},
      { text: "Apprentissage Actif (Mois 1-3)", subTasks: [
          { text: "Consacrer du temps chaque jour/semaine à l'étude (vocabulaire, grammaire, exercices)." },
          { text: "Pratiquer la compréhension orale (podcasts, vidéos pour débutants)." },
          { text: "Pratiquer la lecture (textes simples, histoires pour enfants dans la langue cible)." },
          { text: "Essayer de formuler des phrases simples à l'écrit et à l'oral." },
          { text: "Utiliser des applications de répétition espacée (Anki, Memrise) pour le vocabulaire." },
      ]},
      { text: "Pratique et Évaluation (Continu et Fin de Période)", subTasks: [
          { text: "Trouver des opportunités de pratiquer avec des locuteurs natifs (tandems linguistiques, tuteurs)." },
          { text: "Revoir régulièrement les notions apprises pour consolider ses acquis." },
          { text: "Faire des auto-évaluations ou des mini-tests pour mesurer ses progrès." },
          { text: "À la fin des 3 mois, évaluer son niveau A1 (compréhension, expression) et planifier les prochaines étapes." },
      ]},
    ]},
    { id: 'pd_devperso_2', name: "Préparer un semi-marathon", mainTaskText: "Se préparer pour courir un semi-marathon en 4 mois", category: "Développement Personnel", subTasks: [
        { text: "Phase 1: Fondation (Mois 1)", subTasks: [
            { text: "Obtenir un avis médical et un certificat si nécessaire." },
            { text: "Acquérir l'équipement de course adapté (chaussures, vêtements)." },
            { text: "Établir un plan d'entraînement progressif pour débutant." },
            { text: "Commencer par 3-4 courses par semaine, en alternant course et marche si besoin." },
            { text: "Intégrer des étirements doux après chaque séance." },
        ]},
        { text: "Phase 2: Augmentation du volume (Mois 2)", subTasks: [
            { text: "Augmenter progressivement la distance de la sortie longue hebdomadaire." },
            { text: "Introduire des séances de fractionné léger une fois par semaine." },
            { text: "Commencer des exercices de renforcement musculaire spécifiques pour coureurs (2 fois/semaine)." },
            { text: "Surveiller son alimentation et son hydratation." },
        ]},
        { text: "Phase 3: Spécificité et endurance (Mois 3)", subTasks: [
            { text: "Continuer d'augmenter la sortie longue (jusqu'à 15-18km)." },
            { text: "Intensifier légèrement les séances de fractionné." },
            { text: "Participer à une course de préparation (5km ou 10km) si possible." },
            { text: "Apprendre à gérer son allure de course et à s'écouter." },
        ]},
        { text: "Phase 4: Affûtage et Course (Mois 4)", subTasks: [
            { text: "Réduire le volume d'entraînement les 2-3 dernières semaines (affûtage)." },
            { text: "Planifier sa logistique pour le jour de la course (transport, matériel)." },
            { text: "Préparer sa stratégie de ravitaillement pendant la course." },
            { text: "Se reposer et bien dormir la semaine précédant la course." },
            { text: "Courir le semi-marathon et savourer l'accomplissement !" },
            { text: "Prévoir une récupération active après la course." },
        ]},
    ]},
    { id: 'pd_dom_1', name: "Grand nettoyage de printemps", mainTaskText: "Effectuer un grand nettoyage de printemps complet de la maison", category: "Domestique Complexe", subTasks: [
        { text: "Planification et Préparation", subTasks: [
            { text: "Faire l'inventaire des produits de nettoyage nécessaires et les acheter." },
            { text: "Établir un planning pièce par pièce sur plusieurs jours ou week-ends." },
            { text: "Préparer des boîtes pour trier : à garder, à donner, à jeter, à vendre." },
        ]},
        { text: "Nettoyage en Profondeur des Pièces de Vie (Salon, Salle à Manger)", subTasks: [
            { text: "Dépoussiérer les plafonds, murs, luminaires et meubles." },
            { text: "Laver les vitres, rideaux et voilages." },
            { text: "Nettoyer les canapés et fauteuils (aspirer, détacher)." },
            { text: "Shampouiner les tapis ou les faire nettoyer." },
            { text: "Nettoyer les sols en profondeur." },
        ]},
        { text: "Nettoyage en Profondeur Cuisine et Salle de Bain", subTasks: [
            { text: "Dégraisser la hotte, le four, le micro-ondes." },
            { text: "Nettoyer et désinfecter le réfrigérateur et le congélateur." },
            { text: "Détartrer les robinets, la douche, la baignoire et les toilettes." },
            { text: "Laver les carrelages muraux et les joints." },
            { text: "Vider et nettoyer les placards et tiroirs." },
        ]},
        { text: "Nettoyage en Profondeur Chambres et Autres Espaces", subTasks: [
            { text: "Aérer et nettoyer les matelas, laver les couettes et oreillers." },
            { text: "Trier et ranger les armoires et dressings." },
            { text: "Nettoyer sous les lits et les meubles." },
            { text: "Organiser les bureaux, bibliothèques et autres rangements." },
            { text: "S'occuper des espaces oubliés (entrée, couloirs, buanderie)." },
        ]},
    ]},
     { id: 'pd_gp_3', name: "Rédiger un mémoire de fin d'études", mainTaskText: "Rédiger et soutenir un mémoire de fin d'études universitaires", category: "Gestion de Projet", subTasks: [
        { text: "Phase 1: Recherche et Planification (Mois 1-2)", subTasks: [
            { text: "Choisir un sujet de mémoire pertinent et validé par le directeur de recherche." },
            { text: "Effectuer une revue de littérature approfondie sur le sujet." },
            { text: "Définir la problématique, les hypothèses et la méthodologie de recherche." },
            { text: "Élaborer un plan détaillé du mémoire (structure, chapitres)." },
            { text: "Créer un rétroplanning réaliste avec des échéances claires." },
        ]},
        { text: "Phase 2: Collecte de Données et Rédaction (Mois 3-5)", subTasks: [
            { text: "Mettre en œuvre la méthodologie (enquêtes, entretiens, expériences, analyses de documents)." },
            { text: "Collecter et organiser les données brutes." },
            { text: "Analyser les données recueillies." },
            { text: "Rédiger le corps du mémoire, chapitre par chapitre, en suivant le plan." },
            { text: "Intégrer les sources et références bibliographiques au fur et à mesure." },
            { text: "Solliciter des relectures et feedbacks réguliers du directeur de recherche." },
        ]},
        { text: "Phase 3: Finalisation et Soutenance (Mois 6)", subTasks: [
            { text: "Rédiger l'introduction et la conclusion du mémoire." },
            { text: "Effectuer une relecture orthographique, grammaticale et stylistique approfondie." },
            { text: "Mettre en page le document final selon les normes de l'université." },
            { text: "Imprimer et relier les exemplaires nécessaires." },
            { text: "Préparer le support de présentation pour la soutenance orale." },
            { text: "Répéter la présentation et anticiper les questions du jury." },
            { text: "Passer la soutenance et gérer le stress." },
        ]},
    ]},
    { id: 'pd_evt_3', name: "Organiser un voyage à l'étranger (1 semaine)", mainTaskText: "Organiser un voyage d'une semaine à l'étranger pour deux personnes", category: "Événementiel", subTasks: [
        { text: "Planification Initiale (3-6 mois avant)", subTasks: [
            { text: "Choisir la destination en fonction des envies, du budget et de la saison." },
            { text: "Définir les dates exactes du voyage et la durée." },
            { text: "Vérifier la validité des passeports et les besoins en visa." },
            { text: "Estimer le budget total (transport, hébergement, activités, nourriture)." },
            { text: "Commencer à épargner si nécessaire." },
        ]},
        { text: "Réservations (2-4 mois avant)", subTasks: [
            { text: "Comparer et réserver les vols ou autres moyens de transport principaux." },
            { text: "Rechercher et réserver l'hébergement (hôtel, Airbnb, auberge)." },
            { text: "Souscrire à une assurance voyage (annulation, santé, rapatriement)." },
            { text: "Réserver certaines activités ou visites populaires à l'avance si besoin." },
        ]},
        { text: "Préparatifs (1 mois à 1 semaine avant)", subTasks: [
            { text: "Établir un itinéraire journalier détaillé mais flexible." },
            { text: "Se renseigner sur les coutumes locales, la langue de base et la monnaie." },
            { text: "Préparer une liste des choses à emporter (vêtements, médicaments, adaptateurs)." },
            { text: "Faire des photocopies des documents importants (passeport, billets)." },
            { text: "Informer sa banque de ses dates de voyage pour éviter le blocage des cartes." },
            { text: "Télécharger des cartes hors ligne et des applications utiles." },
        ]},
        { text: "Derniers Jours et Voyage (J-3 au Jour J)", subTasks: [
            { text: "Faire sa valise et vérifier le poids des bagages." },
            { text: "Confirmer les horaires de vol et s'enregistrer en ligne si possible." },
            { text: "Prévoir le transport vers l'aéroport ou la gare." },
            { text: "S'assurer d'avoir de la monnaie locale pour l'arrivée." },
            { text: "Profiter du voyage !" },
        ]},
    ]},
    { id: 'pd_devperso_3', name: "Créer un potager en carrés", mainTaskText: "Créer un potager en carrés surélevés dans son jardin", category: "Développement Personnel", subTasks: [
      { text: "Conception et Matériaux (Printemps ou Automne)", subTasks: [
          { text: "Choisir un emplacement ensoleillé (minimum 6h de soleil par jour)." },
          { text: "Déterminer la taille et le nombre de carrés potagers souhaités." },
          { text: "Dessiner un plan d'aménagement des carrés et des allées." },
          { text: "Acheter ou récupérer les matériaux pour construire les structures des carrés (planches de bois non traité, équerres)." },
          { text: "Se procurer du géotextile pour tapisser le fond des carrés (optionnel)." },
      ]},
      { text: "Construction et Remplissage", subTasks: [
          { text: "Assembler les structures des carrés potagers." },
          { text: "Niveler le sol et positionner les carrés à leur emplacement définitif." },
          { text: "Tapisser le fond avec du géotextile si utilisé." },
          { text: "Remplir les carrés avec un mélange de terre de jardin, compost et terreau (méthode 'lasagne' possible)." },
          { text: "Arroser abondamment et laisser la terre se tasser quelques jours." },
      ]},
      { text: "Plantation et Entretien", subTasks: [
          { text: "Choisir les légumes, herbes et fleurs adaptés à la saison et à l'exposition." },
          { text: "Planifier les associations de cultures (compagnonnage) et les rotations." },
          { text: "Acheter les graines ou les jeunes plants." },
          { text: "Semer ou planter en respectant les espacements et les profondeurs recommandées." },
          { text: "Installer un système d'arrosage (goutte-à-goutte ou arrosoir) et pailler le sol." },
          { text: "Entretenir régulièrement : arrosage, désherbage, surveillance des maladies et ravageurs." },
      ]},
    ]},
    { id: 'pd_dom_2', name: "Rénover une cuisine", mainTaskText: "Rénover entièrement une cuisine de taille moyenne", category: "Domestique Complexe", subTasks: [
      { text: "Phase 1: Conception et Budgétisation", subTasks: [
          { text: "Définir ses besoins, son style et son budget global pour la rénovation." },
          { text: "Prendre les mesures exactes de la pièce et créer un plan d'aménagement (îlot, L, U)." },
          { text: "Choisir les matériaux (meubles, plans de travail, crédence, sol, peinture)." },
          { text: "Sélectionner l'électroménager (four, plaques, hotte, frigo, lave-vaisselle)." },
          { text: "Consulter des cuisinistes ou des artisans pour obtenir des devis détaillés." },
          { text: "Finaliser le plan et le budget, et valider les commandes." },
      ]},
      { text: "Phase 2: Préparation et Démolition", subTasks: [
          { text: "Vider entièrement la cuisine (meubles, électroménager, contenu des placards)." },
          { text: "Protéger les sols et les accès aux autres pièces." },
          { text: "Couper l'eau, le gaz et l'électricité (par un professionnel si besoin)." },
          { text: "Démonter les anciens meubles, l'ancien électroménager et l'ancienne crédence." },
          { text: "Déposer l'ancien revêtement de sol si nécessaire." },
          { text: "Évacuer les gravats et nettoyer la zone de chantier." },
      ]},
      { text: "Phase 3: Travaux et Installation", subTasks: [
          { text: "Effectuer les travaux de plomberie et d'électricité (déplacer les arrivées/évacuations, prises)." },
          { text: "Préparer les murs (rebouchage, enduit) et le sol (ragréage si besoin)." },
          { text: "Poser le nouveau revêtement de sol." },
          { text: "Peindre les murs et le plafond." },
          { text: "Monter et installer les nouveaux meubles de cuisine." },
          { text: "Installer le plan de travail, l'évier et la crédence." },
          { text: "Raccorder et installer le nouvel électroménager." },
          { text: "Installer les luminaires et les finitions (poignées, plinthes)." },
      ]},
    ]},
    { id: 'pd_gp_4', name: "Écrire un livre blanc professionnel", mainTaskText: "Écrire un livre blanc sur une expertise métier", category: "Gestion de Projet", subTasks: [
        { text: "Définition du sujet et de la cible", subTasks: [
            { text: "Identifier un sujet à forte valeur ajoutée pour le public cible." },
            { text: "Définir les objectifs du livre blanc (notoriété, génération de leads, etc.)." },
            { text: "Réaliser une recherche préliminaire pour valider la pertinence du sujet." },
        ]},
        { text: "Structuration et rédaction", subTasks: [
            { text: "Élaborer un plan détaillé avec les sections et sous-sections." },
            { text: "Collecter les informations, données, études de cas nécessaires." },
            { text: "Rédiger le contenu en adoptant un style clair et professionnel." },
            { text: "Intégrer des visuels (graphiques, schémas) pour illustrer les propos." },
        ]},
        { text: "Mise en page et diffusion", subTasks: [
            { text: "Relire et faire corriger le contenu (orthographe, grammaire, cohérence)." },
            { text: "Concevoir une mise en page attractive et professionnelle (charte graphique)." },
            { text: "Convertir au format PDF." },
            { text: "Mettre en place une landing page pour le téléchargement." },
            { text: "Promouvoir le livre blanc via différents canaux (email, réseaux sociaux, site web)." },
        ]},
    ]},
    { id: 'pd_evt_4', name: "Organiser un team building d'entreprise", mainTaskText: "Organiser une journée de team building pour une équipe de 20 personnes", category: "Événementiel", subTasks: [
        { text: "Planification et Choix de l'activité", subTasks: [
            { text: "Sonder l'équipe pour connaître leurs préférences et contraintes." },
            { text: "Définir les objectifs du team building (cohésion, communication, détente)." },
            { text: "Choisir une activité principale (escape game, atelier cuisine, activité sportive, etc.)." },
            { text: "Fixer une date et un budget." },
            { text: "Réserver l'activité et le lieu si nécessaire." },
        ]},
        { text: "Logistique et Communication", subTasks: [
            { text: "Organiser le transport si l'activité est à l'extérieur." },
            { text: "Prévoir un repas ou des collations." },
            { text: "Communiquer clairement le programme et les informations pratiques aux participants." },
            { text: "Gérer les inscriptions ou confirmations de présence." },
        ]},
        { text: "Animation et Suivi", subTasks: [
            { text: "Animer ou coordonner l'animation de l'activité le jour J." },
            { text: "Favoriser la participation et la bonne ambiance." },
            { text: "Prendre des photos ou vidéos (avec accord)." },
            { text: "Recueillir les feedbacks après l'événement." },
        ]},
    ]},
    { id: 'pd_devperso_4', name: "Créer un portfolio en ligne", mainTaskText: "Créer un portfolio en ligne pour présenter ses travaux", category: "Développement Personnel", subTasks: [
        { text: "Collecte et sélection des travaux", subTasks: [
            { text: "Rassembler tous ses projets, réalisations et expériences pertinentes." },
            { text: "Sélectionner les meilleurs travaux qui mettent en valeur ses compétences." },
            { text: "Rédiger des descriptifs clairs et concis pour chaque projet." },
        ]},
        { text: "Choix de la plateforme et conception", subTasks: [
            { text: "Choisir une plateforme (Behance, Dribbble, Adobe Portfolio, site personnel)." },
            { text: "Définir la structure et le design du portfolio." },
            { text: "Créer une page 'À propos' et un moyen de contact." },
        ]},
        { text: "Mise en ligne et promotion", subTasks: [
            { text: "Mettre en ligne les projets avec leurs descriptifs et visuels." },
            { text: "Optimiser pour le référencement (SEO) si c'est un site personnel." },
            { text: "Relire attentivement l'ensemble du portfolio." },
            { text: "Partager le lien sur ses réseaux professionnels et son CV." },
        ]},
    ]},
    { id: 'pd_dom_3', name: "Organiser son garage/grenier", mainTaskText: "Désencombrer et organiser son garage ou son grenier", category: "Domestique Complexe", subTasks: [
        { text: "Préparation et Tri", subTasks: [
            { text: "Vider entièrement l'espace (ou par grandes zones)." },
            { text: "Nettoyer l'espace vidé (poussière, toiles d'araignées)." },
            { text: "Trier tous les objets : à garder, à donner, à vendre, à jeter." },
        ]},
        { text: "Optimisation du Rangement", subTasks: [
            { text: "Planifier des solutions de rangement (étagères, boîtes, crochets)." },
            { text: "Acheter ou construire le matériel de rangement nécessaire." },
            { text: "Regrouper les objets par catégorie (outils, décorations de Noël, souvenirs, etc.)." },
        ]},
        { text: "Rangement et Finalisation", subTasks: [
            { text: "Ranger les objets gardés dans les solutions de rangement." },
            { text: "Étiqueter clairement les boîtes et les zones." },
            { text: "Évacuer les objets à donner, vendre ou jeter." },
            { text: "Maintenir l'organisation sur le long terme." },
        ]},
    ]},
    { id: 'pd_gp_5', name: "Changer de fournisseur d'énergie", mainTaskText: "Changer de fournisseur d'électricité et/ou de gaz", category: "Gestion de Projet", subTasks: [
        { text: "Analyse des besoins et comparaison", subTasks: [
            { text: "Rassembler ses factures actuelles pour connaître sa consommation." },
            { text: "Utiliser un comparateur en ligne pour identifier les offres intéressantes." },
            { text: "Vérifier les conditions (prix du kWh, abonnement, options vertes, service client)." },
        ]},
        { text: "Souscription et résiliation", subTasks: [
            { text: "Souscrire au contrat du nouveau fournisseur (en ligne ou par téléphone)." },
            { text: "Fournir les informations nécessaires (PDL/PCE, relevé de compteur)." },
            { text: "Le nouveau fournisseur se charge généralement de la résiliation de l'ancien contrat." },
        ]},
        { text: "Suivi et vérification", subTasks: [
            { text: "Noter la date de changement effectif." },
            { text: "Recevoir et vérifier la facture de clôture de l'ancien fournisseur." },
            { text: "Vérifier la première facture du nouveau fournisseur." },
        ]},
    ]},
     { id: 'pd_evt_5', name: "Organiser une collecte de fonds", mainTaskText: "Organiser une petite collecte de fonds pour une association locale", category: "Événementiel", subTasks: [
        { text: "Phase 1: Définition et Planification", subTasks: [
            { text: "Choisir l'association bénéficiaire et définir l'objectif financier." },
            { text: "Brainstormer des idées d'événements ou d'actions de collecte (vente de gâteaux, tombola, événement sportif, cagnotte en ligne)." },
            { text: "Fixer une date et un lieu (si événement physique)." },
            { text: "Établir un budget prévisionnel pour l'organisation." },
            { text: "Recruter une petite équipe de bénévoles si nécessaire." },
        ]},
        { text: "Phase 2: Préparation et Communication", subTasks: [
            { text: "Obtenir les autorisations nécessaires si événement public." },
            { text: "Créer les supports de communication (affiches, flyers, posts réseaux sociaux)." },
            { text: "Contacter les partenaires potentiels ou sponsors locaux." },
            { text: "Mettre en place la logistique de l'événement (matériel, stands, gestion des dons)." },
            { text: "Communiquer largement sur l'événement et l'objectif de la collecte." },
        ]},
        { text: "Phase 3: Déroulement et Clôture", subTasks: [
            { text: "Gérer l'événement ou l'action de collecte le jour J." },
            { text: "Remercier les donateurs et les participants." },
            { text: "Comptabiliser les fonds récoltés." },
            { text: "Verser les fonds à l'association bénéficiaire." },
            { text: "Communiquer sur les résultats de la collecte et remercier publiquement les contributeurs." },
        ]},
    ]},
     { id: 'pd_devperso_5', name: "Apprendre la photographie (bases)", mainTaskText: "Apprendre les bases de la photographie avec un reflex/hybride", category: "Développement Personnel", subTasks: [
        { text: "Comprendre son appareil photo", subTasks: [
            { text: "Lire le manuel de son appareil photo." },
            { text: "Se familiariser avec les modes principaux (Auto, P, A/Av, S/Tv, M)." },
            { text: "Apprendre à régler l'ouverture, la vitesse d'obturation et l'ISO." },
            { text: "Comprendre la balance des blancs et la mise au point." },
        ]},
        { text: "Maîtriser les règles de composition", subTasks: [
            { text: "Apprendre la règle des tiers." },
            { text: "Utiliser les lignes directrices et les points de fuite." },
            { text: "Jouer avec la profondeur de champ." },
            { text: "Soigner le premier plan et l'arrière-plan." },
        ]},
        { text: "Pratiquer et expérimenter", subTasks: [
            { text: "Choisir différents sujets (portrait, paysage, macro, rue)." },
            { text: "S'entraîner régulièrement en variant les conditions de lumière." },
            { text: "Analyser ses photos et identifier les points d'amélioration." },
            { text: "Rejoindre des groupes de photographes pour partager et apprendre." },
            { text: "Apprendre les bases du post-traitement (Lightroom, GIMP)." },
        ]},
    ]},
    { id: 'pd_dom_4', name: "Préparer sa maison pour l'hiver", mainTaskText: "Préparer sa maison ou son appartement pour l'hiver", category: "Domestique Complexe", subTasks: [
        { text: "Isolation et Chauffage", subTasks: [
            { text: "Vérifier l'isolation des fenêtres et portes (joints, calfeutrage)." },
            { text: "Isoler les tuyaux exposés au gel." },
            { text: "Faire entretenir sa chaudière ou son système de chauffage." },
            { text: "Purger les radiateurs." },
        ]},
        { text: "Extérieur et Jardin (si applicable)", subTasks: [
            { text: "Nettoyer les gouttières." },
            { text: "Ranger le mobilier de jardin et protéger les plantes sensibles au gel." },
            { text: "Couper l'arrivée d'eau extérieure et vidanger les tuyaux." },
        ]},
        { text: "Sécurité et Confort Intérieur", subTasks: [
            { text: "Vérifier le détecteur de fumée et de monoxyde de carbone." },
            { text: "Préparer des couvertures supplémentaires et des vêtements chauds." },
            { text: "Faire des réserves de sel de déneigement et de bougies en cas de coupure." },
        ]},
    ]},
];


interface FetchTaskDataOptions {
  newContextToSet?: string;
  preserveActiveState?: boolean;
}

const buildTree = (tasks: UITaskBreakerTask[], parentId: string | null = null): UITaskBreakerTask[] => {
  return tasks
    .filter(task => task.parent_id === parentId)
    .sort((a, b) => a.order - b.order)
    .map(task => ({
      ...task,
      subTasks: buildTree(tasks, task.id),
    }));
};

const mapDbTasksToUiTasks = (dbTasks: TaskBreakerTask[], currentExpandedStates: Record<string, boolean>): UITaskBreakerTask[] => {
    return dbTasks.map(dbTask => ({
        ...dbTask,
        isExpanded: currentExpandedStates[dbTask.id] || false,
        subTasks: [] // Will be populated by buildTree based on current context
    }));
};

interface RenderTaskNodeProps {
  task: UITaskBreakerTask;
  toolMode: 'magique' | 'genie';
  showTimeEstimates: boolean;
  isLoadingAI: boolean;
  loadingAITaskId: string | null;
  isSubmitting: boolean;
  user: any; // Replace with actual User type from useAuth if available
  newChildSubTaskText: { [parentId: string]: string };
  expandedStates: Record<string, boolean>;
  allUiTasksFlat: UITaskBreakerTask[]; // Pass this for progress calculation context

  // Callbacks
  onToggleExpansion: (taskId: string) => void;
  onToggleCompletion: (taskId: string) => void;
  onDebouncedChange: (taskId: string, field: 'text' | 'estimated_time_minutes', value: string | number | null, debounceRef: React.MutableRefObject<Record<string, NodeJS.Timeout>>, forceSave?: boolean) => void;
  onGenieBreakdown: (taskText: string, parentId: string | null) => void;
  onAddManualSubTask: (parentId: string | null) => void;
  onDeleteSubTask: (taskId: string) => void;
  setNewChildSubTaskText: React.Dispatch<React.SetStateAction<{ [parentId: string]: string }>>;
  
  textDebounceTimeouts: React.MutableRefObject<Record<string, NodeJS.Timeout>>;
  timeEstimateDebounceTimeouts: React.MutableRefObject<Record<string, NodeJS.Timeout>>;
  calculateProgress: (task: UITaskBreakerTask) => { completedLeaves: number, totalLeaves: number };
  formatTime: (totalMinutes: number | null | undefined) => string;
  calculateTotalEstimatedTime: (taskId: string) => number;
}

const RenderTaskNodeComponent: React.FC<RenderTaskNodeProps> = ({
  task, toolMode, showTimeEstimates, isLoadingAI, loadingAITaskId, isSubmitting, user,
  newChildSubTaskText, expandedStates, allUiTasksFlat,
  onToggleExpansion, onToggleCompletion, onDebouncedChange, onGenieBreakdown,
  onAddManualSubTask, onDeleteSubTask, setNewChildSubTaskText,
  textDebounceTimeouts, timeEstimateDebounceTimeouts,
  calculateProgress, formatTime, calculateTotalEstimatedTime
}) => {
    const textInputRef = useRef<HTMLInputElement>(null);
    const timeInputRef = useRef<HTMLInputElement>(null);
    const [isTextFocused, setIsTextFocused] = useState(false);
    const [isTimeFocused, setIsTimeFocused] = useState(false);

    useEffect(() => {
        if (textInputRef.current && task.text !== textInputRef.current.value && !isTextFocused) {
            textInputRef.current.value = task.text;
        }
    }, [task.text, isTextFocused]);

    useEffect(() => {
        if (timeInputRef.current && !isTimeFocused) {
            const currentVal = task.estimated_time_minutes === null || task.estimated_time_minutes === undefined ? '' : task.estimated_time_minutes.toString();
            if (currentVal !== timeInputRef.current.value) {
                timeInputRef.current.value = currentVal;
            }
        }
    }, [task.estimated_time_minutes, isTimeFocused]);
    
    const handleLocalTextChange = () => {
        if (textInputRef.current) {
            onDebouncedChange(task.id, 'text', textInputRef.current.value, textDebounceTimeouts);
        }
    };

    const handleLocalTextBlur = () => {
        setIsTextFocused(false);
        if (textInputRef.current) {
            onDebouncedChange(task.id, 'text', textInputRef.current.value, textDebounceTimeouts, true); // Force save on blur
        }
    };

    const handleLocalTimeEstimateChange = () => {
        if (timeInputRef.current) {
            const value = timeInputRef.current.value;
            const numValue = value === '' ? null : parseInt(value, 10);
            if (value === '' || (!isNaN(numValue!) && numValue! >= 0)) {
                onDebouncedChange(task.id, 'estimated_time_minutes', numValue, timeEstimateDebounceTimeouts);
            }
        }
    };
     const handleLocalTimeEstimateBlur = () => {
        setIsTimeFocused(false);
        if (timeInputRef.current) {
            const value = timeInputRef.current.value;
            const numValue = value === '' ? null : parseInt(value, 10);
            if (value === '' || (!isNaN(numValue!) && numValue! >= 0)) {
                 onDebouncedChange(task.id, 'estimated_time_minutes', numValue, timeEstimateDebounceTimeouts, true); // Force save
            }
        }
    };
    
    const isCurrentlyLoadingAI = isLoadingAI && loadingAITaskId === task.id;
    const { completedLeaves, totalLeaves } = toolMode === 'genie' ? calculateProgress(task) : { completedLeaves: 0, totalLeaves: 0 };
    const progressPercentage = totalLeaves > 0 ? (completedLeaves / totalLeaves) * 100 : (task.is_completed ? 100 : 0);
    const hasChildren = allUiTasksFlat.some(t => t.parent_id === task.id && t.main_task_text_context === task.main_task_text_context);
    
    const directEstimateFormatted = (toolMode === 'genie' && showTimeEstimates && task.estimated_time_minutes && task.estimated_time_minutes > 0) ? `Est: ${formatTime(task.estimated_time_minutes)}` : "";
    const cumulativeEstimate = (toolMode === 'genie' && showTimeEstimates) ? calculateTotalEstimatedTime(task.id) : 0;
    const cumulativeEstimateFormatted = (cumulativeEstimate > 0 && cumulativeEstimate !== task.estimated_time_minutes) ? ` / \u2211 ${formatTime(cumulativeEstimate)}` : ""; // \u2211 is ∑
    const displayTimeInfo = (directEstimateFormatted || cumulativeEstimateFormatted) ? ` (${directEstimateFormatted}${cumulativeEstimateFormatted})` : "";

    return (
      <div style={{ marginLeft: `${task.depth * 15}px` }} className="mb-1.5">
        <div className={`flex items-center gap-1 p-1.5 border rounded-md bg-background hover:bg-muted/50 ${task.is_completed && !hasChildren ? 'opacity-60' : ''}`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onToggleExpansion(task.id)} className="h-6 w-6 p-0 shrink-0">
                  {expandedStates[task.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{expandedStates[task.id] ? "Replier" : "Déplier"} cette étape pour voir/ajouter des sous-tâches.</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onToggleCompletion(task.id)} aria-label={task.is_completed ? "Marquer comme non terminée" : "Marquer comme terminée"} className="h-6 w-6 p-0 shrink-0" disabled={isSubmitting || isLoadingAI || !user || (toolMode === 'genie' && hasChildren) }>
                  {task.is_completed && (!hasChildren || toolMode === 'magique') ? <CheckSquare className="text-green-500 h-4 w-4" /> : <Square className="text-muted-foreground h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{(toolMode === 'genie' && hasChildren) ? "Le progrès est basé sur les sous-tâches." : (task.is_completed ? "Marquer comme non terminée" : "Marquer comme terminée")}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            ref={textInputRef}
            defaultValue={task.text}
            onFocus={() => setIsTextFocused(true)}
            onBlur={handleLocalTextBlur}
            onChange={handleLocalTextChange}
            className={`flex-grow bg-transparent border-0 focus:ring-0 h-auto py-0 text-sm ${task.is_completed && !hasChildren ? 'line-through text-muted-foreground' : ''}`}
            disabled={isSubmitting || isLoadingAI || !user}
            aria-label={`Texte de la tâche ${task.text}`}
          />
          {displayTimeInfo && <span className="text-xs text-muted-foreground whitespace-nowrap ml-1">{displayTimeInfo}</span>}

          {toolMode === 'genie' && showTimeEstimates && (
            <div className="flex items-center gap-1 ml-2 shrink-0">
                <Input
                    ref={timeInputRef}
                    type="number"
                    min="0"
                    defaultValue={task.estimated_time_minutes === null || task.estimated_time_minutes === undefined ? '' : task.estimated_time_minutes.toString()}
                    onFocus={() => setIsTimeFocused(true)}
                    onBlur={handleLocalTimeEstimateBlur}
                    onChange={handleLocalTimeEstimateChange}
                    className="h-6 w-16 text-xs p-1 text-right"
                    placeholder="min"
                    disabled={isSubmitting || isLoadingAI || !user}
                    aria-label={`Estimation en minutes pour ${task.text}`}
                />
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onGenieBreakdown(task.text, task.id)} aria-label="Décomposer cette tâche avec le Génie" disabled={isCurrentlyLoadingAI || isLoadingAI || isSubmitting || !user} className="h-6 w-6 p-0 shrink-0">
                  {isCurrentlyLoadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="text-primary h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Le Génie décomposera cette étape spécifique en sous-sous-tâches.</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Supprimer la sous-tâche" disabled={isSubmitting ||isLoadingAI || !user} className="h-6 w-6 p-0 shrink-0">
                            <Trash2 className="text-destructive w-4 h-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Supprimer cette étape ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer "{task.text}" et toutes ses sous-étapes dépendantes ?
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteSubTask(task.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </TooltipTrigger>
              <TooltipContent><p>Supprime cette étape et toutes ses sous-étapes dépendantes.</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {toolMode === 'genie' && hasChildren && (
            <div className="ml-6 mt-1 mb-1 pr-1">
                <Progress value={progressPercentage} className="h-2 w-full" />
                <p className="text-xs text-muted-foreground text-right">{completedLeaves}/{totalLeaves} tâches ultimes complétées ({Math.round(progressPercentage)}%)</p>
            </div>
        )}

        {expandedStates[task.id] && (
        <div style={{ marginLeft: `20px` }} className="mt-1 pl-1 flex gap-2 items-center">
          <Label htmlFor={`add-subtask-${task.id}`} className="sr-only">Ajouter une sous-tâche à {task.text}</Label>
          <Input
            id={`add-subtask-${task.id}`}
            value={newChildSubTaskText[task.id] || ''}
            onChange={(e) => setNewChildSubTaskText(prev => ({ ...prev, [task.id]: e.target.value }))}
            placeholder="Ajouter une sous-tâche ici..."
            className="flex-grow h-8 text-xs"
            onKeyPress={(e) => { if (e.key === 'Enter' && !isLoadingAI && !isSubmitting) onAddManualSubTask(task.id); }}
            disabled={isLoadingAI || isSubmitting || !user}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => onAddManualSubTask(task.id)} variant="outline" size="sm" disabled={isLoadingAI || isSubmitting || !(newChildSubTaskText[task.id] || '').trim() || !user} className="h-8 text-xs">
                    <PlusCircle className="mr-1 h-3 w-3" /> Ajouter
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>Ajoute manuellement une sous-tâche à l'étape "{task.text}".</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        )}
        {expandedStates[task.id] && task.subTasks && task.subTasks.length > 0 && (
          <div className="mt-2">
            {task.subTasks.map(childTask => (
              <MemoizedRenderTaskNode 
                key={childTask.id} 
                task={childTask}
                toolMode={toolMode}
                showTimeEstimates={showTimeEstimates}
                isLoadingAI={isLoadingAI}
                loadingAITaskId={loadingAITaskId}
                isSubmitting={isSubmitting}
                user={user}
                newChildSubTaskText={newChildSubTaskText}
                expandedStates={expandedStates}
                allUiTasksFlat={allUiTasksFlat}
                onToggleExpansion={onToggleExpansion}
                onToggleCompletion={onToggleCompletion}
                onDebouncedChange={onDebouncedChange}
                onGenieBreakdown={onGenieBreakdown}
                onAddManualSubTask={onAddManualSubTask}
                onDeleteSubTask={onDeleteSubTask}
                setNewChildSubTaskText={setNewChildSubTaskText}
                textDebounceTimeouts={textDebounceTimeouts}
                timeEstimateDebounceTimeouts={timeEstimateDebounceTimeouts}
                calculateProgress={calculateProgress}
                formatTime={formatTime}
                calculateTotalEstimatedTime={calculateTotalEstimatedTime}
              />
            ))}
          </div>
        )}
      </div>
    );
};

const areEqualTaskNodeProps = (prevProps: RenderTaskNodeProps, nextProps: RenderTaskNodeProps) => {
    if (prevProps.task.id !== nextProps.task.id ||
        prevProps.task.text !== nextProps.task.text ||
        prevProps.task.is_completed !== nextProps.task.is_completed ||
        prevProps.task.estimated_time_minutes !== nextProps.task.estimated_time_minutes ||
        prevProps.expandedStates[prevProps.task.id] !== nextProps.expandedStates[nextProps.task.id] || // Check expansion state from centralized map
        prevProps.task.subTasks.length !== nextProps.task.subTasks.length || // Simple check, could be deeper
        prevProps.toolMode !== nextProps.toolMode ||
        prevProps.showTimeEstimates !== nextProps.showTimeEstimates ||
        prevProps.isLoadingAI !== nextProps.isLoadingAI ||
        prevProps.loadingAITaskId !== nextProps.loadingAITaskId ||
        prevProps.isSubmitting !== nextProps.isSubmitting ||
        prevProps.newChildSubTaskText[prevProps.task.id] !== nextProps.newChildSubTaskText[nextProps.task.id] // Check specific field
        ) {
        return false; // Props are not equal, re-render
    }

    // Check if callback references have changed (they shouldn't if memoized correctly in parent)
    if (prevProps.onToggleExpansion !== nextProps.onToggleExpansion ||
        prevProps.onToggleCompletion !== nextProps.onToggleCompletion ||
        prevProps.onDebouncedChange !== nextProps.onDebouncedChange ||
        prevProps.onGenieBreakdown !== nextProps.onGenieBreakdown ||
        prevProps.onAddManualSubTask !== nextProps.onAddManualSubTask ||
        prevProps.onDeleteSubTask !== nextProps.onDeleteSubTask
        ) {
        return false;
    }
    return true; // Props are equal, skip re-render
};

const MemoizedRenderTaskNode = React.memo(RenderTaskNodeComponent, areEqualTaskNodeProps);


export function TaskBreakerTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [toolMode, setToolMode] = useState<'magique' | 'genie'>('magique');
  const [showTimeEstimates, setShowTimeEstimates] = useState<boolean>(false);
  const [mainTaskInput, setMainTaskInput] = useState<string>('');
  const mainTaskTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [currentMainTaskContext, setCurrentMainTaskContext] = useState<string>('');

  const [allUiTasksFlat, setAllUiTasksFlat] = useState<UITaskBreakerTask[]>([]);
  const [taskTree, setTaskTree] = useState<UITaskBreakerTask[]>([]);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

  const [newDirectSubTaskText, setNewDirectSubTaskText] = useState<string>('');
  const [newChildSubTaskText, setNewChildSubTaskText] = useState<{ [parentId: string]: string }>({});

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [loadingAITaskId, setLoadingAITaskId] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const { user, isOnline } = useAuth();
  
  const textDebounceTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const timeEstimateDebounceTimeouts = useRef<Record<string, NodeJS.Timeout>>({});


  const [history, setHistory] = useState<TaskBreakerSavedBreakdown[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [saveToHistoryDialog, setSaveToHistoryDialog] = useState(false);
  const [currentBreakdownName, setCurrentBreakdownName] = useState('');

  const [showTaskSuggestionDialog, setShowTaskSuggestionDialog] = useState(false);
  const [customCommonPresets, setCustomCommonPresets] = useState<TaskBreakerCustomPreset[]>([]);
  const [showSaveCustomPresetDialog, setShowSaveCustomPresetDialog] = useState(false);
  const [newCustomPresetNameInput, setNewCustomPresetNameInput] = useState('');
  const [showClearTaskDialog, setShowClearTaskDialog] = useState(false);

  const [showDecomposedPresetDialog, setShowDecomposedPresetDialog] = useState(false);

  const mainTaskInputRef = useRef(mainTaskInput);
  useEffect(() => { mainTaskInputRef.current = mainTaskInput; }, [mainTaskInput]);

  const currentMainTaskContextRef = useRef(currentMainTaskContext);
  useEffect(() => { currentMainTaskContextRef.current = currentMainTaskContext; }, [currentMainTaskContext]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem(TASK_BREAKER_MODE_KEY) as 'magique' | 'genie';
      if (savedMode) setToolMode(savedMode);

      const savedTimeEstimatesEnabled = localStorage.getItem(TASK_BREAKER_TIME_ESTIMATES_ENABLED_KEY);
      if (savedTimeEstimatesEnabled !== null) setShowTimeEstimates(JSON.parse(savedTimeEstimatesEnabled));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(TASK_BREAKER_MODE_KEY, toolMode);
  }, [toolMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(TASK_BREAKER_TIME_ESTIMATES_ENABLED_KEY, JSON.stringify(showTimeEstimates));
  }, [showTimeEstimates]);


  const fetchTaskData = useCallback(async (options: FetchTaskDataOptions = {}) => {
    const { newContextToSet, preserveActiveState = false } = options;

    if (!user) {
      setMainTaskInput(''); setCurrentMainTaskContext('');
      setAllUiTasksFlat([]); setTaskTree([]);
      setCustomCommonPresets([]); setHistory([]);
      setExpandedStates({});
      setIsLoadingData(false); return;
    }

    setIsLoadingData(true);
    try {
      const [dbTasks, dbCustomPresets, dbHistory] = await Promise.all([
        getAllTaskBreakerTasks(),
        getAllTaskBreakerCustomPresets(),
        getAllTaskBreakerSavedBreakdowns(),
      ]);

      let currentExpandedFromStorage: Record<string, boolean> = {};
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(TASK_BREAKER_EXPANDED_STATE_KEY);
        if (saved) { try { currentExpandedFromStorage = JSON.parse(saved); } catch (e) { console.error(e);}}
      }

      setAllUiTasksFlat(mapDbTasksToUiTasks(dbTasks, currentExpandedFromStorage));
      setCustomCommonPresets(dbCustomPresets);
      setHistory(dbHistory);

      if (newContextToSet !== undefined) {
        setCurrentMainTaskContext(newContextToSet);
        setMainTaskInput(newContextToSet); 
        setExpandedStates(currentExpandedFromStorage);
      } else if (!preserveActiveState) {
        const latestContextTask = dbTasks
          .filter(t => !t.parent_id && t.main_task_text_context)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

        const contextToLoad = latestContextTask ? latestContextTask.main_task_text_context || '' : '';
        setCurrentMainTaskContext(contextToLoad);

        if (!mainTaskInputRef.current && contextToLoad) { 
          setMainTaskInput(contextToLoad);
        } else if (!mainTaskInputRef.current && !contextToLoad){
           setMainTaskInput('');
        }
        setExpandedStates(currentExpandedFromStorage);
      } else { 
        setExpandedStates(currentExpandedFromStorage);
      }

    } catch (error) {
      console.error("Error fetching TaskBreaker data:", error);
      toast({ title: "Erreur de chargement", description: (error as Error).message, variant: "destructive" });
    }
    finally { setIsLoadingData(false); }
  }, [user, toast, isOnline]); // isOnline added


  useEffect(() => {
    fetchTaskData();
  }, [user, isOnline, fetchTaskData]);

  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(expandedStates).length > 0) {
      localStorage.setItem(TASK_BREAKER_EXPANDED_STATE_KEY, JSON.stringify(expandedStates));
    }
  }, [expandedStates]);


  useEffect(() => {
    const tasksForCurrentContext = currentMainTaskContextRef.current
        ? allUiTasksFlat.filter(t => t.main_task_text_context === currentMainTaskContextRef.current)
        : [];

    const tasksWithCurrentExpansion = tasksForCurrentContext.map(t => ({
        ...t,
        isExpanded: expandedStates[t.id] || false 
    }));
    const newTree = buildTree(tasksWithCurrentExpansion, null);
    setTaskTree(newTree);
  }, [allUiTasksFlat, currentMainTaskContext, expandedStates]);


  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMainTaskInput(prev => prev ? prev + ' ' + transcript : transcript);
        toast({ title: "Tâche principale mise à jour!" });
      };
      recognitionRef.current.onerror = (event: any) => toast({ title: "Erreur de reconnaissance vocale", description: event.error, variant: "destructive" });
      recognitionRef.current.onend = () => setIsListening(false);
    } else console.warn("Speech Recognition API not supported.");
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      Object.values(textDebounceTimeouts.current).forEach(clearTimeout);
      Object.values(timeEstimateDebounceTimeouts.current).forEach(clearTimeout);
    };
  }, [toast]);

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.start(); }
      catch (e) { setIsListening(false); toast({ title: "Erreur Micro", description: "Impossible de démarrer l'écoute.", variant: "destructive"}); }
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening, toast]);

  const handleToggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({ title: "Micro non supporté", variant: "destructive" });
      return;
    }
    setIsListening(prev => !prev);
  };

  const handleDebouncedChange = useCallback(async (taskId: string, field: 'text' | 'estimated_time_minutes', value: string | number | null, debounceRef: React.MutableRefObject<Record<string, NodeJS.Timeout>>, forceSave: boolean = false) => {
    if (!user) return;

    if (debounceRef.current[taskId] && !forceSave) {
        clearTimeout(debounceRef.current[taskId]);
    }

    const saveFunction = async () => {
        setIsSubmitting(true);
        try {
            const payload: Partial<CreateTaskBreakerTaskDTO> = { [field]: value };
            const updatedDbTask = await updateTaskBreakerTask(taskId, payload);
            setAllUiTasksFlat(prevFlat =>
                prevFlat.map(t =>
                    t.id === taskId
                        ? { ...t, ...updatedDbTask, subTasks: t.subTasks, isExpanded: expandedStates[t.id] || false }
                        : t
                )
            );
        } catch (error) {
            console.error(`Error saving task ${field}:`, error);
            toast({ title: "Erreur de sauvegarde", description: (error as Error).message, variant: "destructive"});
            await fetchTaskData({ preserveActiveState: true });
        } finally {
            setIsSubmitting(false);
            delete debounceRef.current[taskId];
        }
    };

    if (forceSave) {
        await saveFunction();
    } else {
        debounceRef.current[taskId] = setTimeout(saveFunction, 1200);
    }
  }, [user, toast, fetchTaskData, expandedStates]);


  const handleGenieBreakdown = useCallback(async (taskTextToBreak: string, parentId: string | null) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    if (!taskTextToBreak.trim()) { toast({ title: "Tâche manquante", variant: "destructive" }); return; }

    setIsLoadingAI(true);
    setLoadingAITaskId(parentId);

    let contextForNewTasks = currentMainTaskContextRef.current;
    if (!parentId) { 
      if (!mainTaskInputRef.current.trim()) {
        toast({ title: "Tâche principale vide", variant: "destructive" });
        setIsLoadingAI(false); setLoadingAITaskId(null); return;
      }
      contextForNewTasks = mainTaskInputRef.current; 
      if (currentMainTaskContextRef.current !== mainTaskInputRef.current) {
          setCurrentMainTaskContext(mainTaskInputRef.current); 
          setAllUiTasksFlat(prev => prev.filter(t => t.main_task_text_context !== mainTaskInputRef.current));
      } else {
         setAllUiTasksFlat(prev => prev.filter(t => !(t.parent_id === null && t.main_task_text_context === contextForNewTasks)));
      }
    } else { 
      const parentTask = allUiTasksFlat.find(t => t.id === parentId);
      if (!parentTask || !parentTask.main_task_text_context) {
        toast({ title: "Erreur de contexte parent", variant: "destructive" });
        setIsLoadingAI(false); setLoadingAITaskId(null); return;
      }
      contextForNewTasks = parentTask.main_task_text_context; 
      setAllUiTasksFlat(prev => prev.filter(t => !(t.parent_id === parentId && t.main_task_text_context === contextForNewTasks)));
    }

    try {
      const result: BreakdownTaskOutput = await breakdownTask({ mainTaskText: taskTextToBreak, intensityLevel: intensity });
      
      if (result.error) {
        let userMessage = "Le service de décomposition est temporairement indisponible. Veuillez réessayer plus tard.";
        if (result.error === "INVALID_OUTPUT_STRUCTURE" || result.error === "OUTPUT_VALIDATION_ERROR") {
          userMessage = "Le Génie a retourné une réponse inattendue. Veuillez réessayer.";
        } else if (result.error.startsWith("INPUT_VALIDATION_ERROR")) {
            userMessage = "Erreur de validation des données envoyées au Génie."
        } else if (result.error === "UNEXPECTED_ERROR_IN_WRAPPER"){
            userMessage = "Une erreur inattendue s'est produite avant d'appeler le Génie."
        } else if (result.error === "API_ERROR_IN_FLOW") {
            userMessage = "Une erreur de communication avec le Génie s'est produite.";
        } else if (result.error === "SERVICE_UNAVAILABLE" || result.error === "SERVICE_UNAVAILABLE_IN_FLOW") {
            userMessage = "Le service IA est actuellement surchargé ou indisponible. Veuillez réessayer plus tard.";
        }
        toast({ title: "Erreur du Génie IA", description: userMessage, variant: "destructive", duration: 7000 });
        setIsLoadingAI(false); setLoadingAITaskId(null); return;
      }


      const parentTask = parentId ? allUiTasksFlat.find(t => t.id === parentId) : null;
      const currentDepth = parentTask ? parentTask.depth + 1 : 0;

      const existingSiblings = allUiTasksFlat.filter(t => t.parent_id === parentId && t.main_task_text_context === contextForNewTasks);
      let orderOffset = existingSiblings.length > 0 ? Math.max(...existingSiblings.map(s => s.order)) + 1 : 0;

      const addedTasksFromAI: UITaskBreakerTask[] = [];
      for (const [index, subTaskSuggestion] of result.suggestedSubTasks.entries()) {
          const taskDto: CreateTaskBreakerTaskDTO = {
            text: subTaskSuggestion.text,
            parent_id: parentId,
            main_task_text_context: contextForNewTasks,
            is_completed: false,
            depth: currentDepth,
            order: orderOffset + index,
            estimated_time_minutes: subTaskSuggestion.estimated_time_minutes ?? null,
          };
          const addedTask = await addTaskBreakerTask(taskDto);
          addedTasksFromAI.push({ ...addedTask, subTasks: [], isExpanded: true }); 
      }

      setAllUiTasksFlat(prev => [...prev, ...addedTasksFromAI]);
      if (parentId) setExpandedStates(prev => ({...prev, [parentId]: true}));

      if (addedTasksFromAI.length > 0) toast({ title: "Tâche décomposée par le Génie!" });
      else toast({ title: "Le Génie a besoin de plus de détails", description: "Aucune sous-tâche suggérée." });

    } catch (error) {
      console.error("Error AI breakdown:", error);
      toast({ title: "Erreur du Génie", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingAI(false);
      setLoadingAITaskId(null);
    }
  }, [user, intensity, currentMainTaskContext, mainTaskInput, allUiTasksFlat, toast, setCurrentMainTaskContext, setMainTaskInput]);

  const handleAddManualSubTask = useCallback(async (parentId: string | null) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    const text = parentId ? (newChildSubTaskText[parentId] || '').trim() : newDirectSubTaskText.trim();
    if (!text) { toast({ title: "Texte de tâche vide", variant: "destructive" }); return; }

    setIsSubmitting(true);

    let contextForNewTask = currentMainTaskContextRef.current;
    if (!parentId) { 
        if (!mainTaskInputRef.current.trim()) {
            toast({ title: "Tâche principale vide", variant: "destructive" });
            setIsSubmitting(false); return;
        }
        contextForNewTask = mainTaskInputRef.current; 
        if (currentMainTaskContextRef.current !== mainTaskInputRef.current) {
            setCurrentMainTaskContext(mainTaskInputRef.current);
            setAllUiTasksFlat(prev => prev.filter(t => t.main_task_text_context !== mainTaskInputRef.current));
        }
    } else { 
        const parentTask = allUiTasksFlat.find(t => t.id === parentId);
        if (!parentTask || !parentTask.main_task_text_context) {
            toast({ title: "Erreur de contexte parent", variant: "destructive" });
            setIsSubmitting(false); return;
        }
        contextForNewTask = parentTask.main_task_text_context; 
    }

    try {
      const parentTask = parentId ? allUiTasksFlat.find(t => t.id === parentId) : null;
      const depth = parentTask ? parentTask.depth + 1 : 0;

      const existingSiblings = allUiTasksFlat.filter(t => t.parent_id === parentId && t.main_task_text_context === contextForNewTask);
      let order = existingSiblings.length > 0 ? Math.max(...existingSiblings.map(s => s.order)) + 1 : 0;

      const taskDto: CreateTaskBreakerTaskDTO = {
        text,
        parent_id: parentId,
        main_task_text_context: contextForNewTask,
        is_completed: false,
        depth,
        order,
        estimated_time_minutes: null, 
      };
      const addedTask = await addTaskBreakerTask(taskDto);
      setAllUiTasksFlat(prev => [...prev, {...addedTask, subTasks: [], isExpanded: true}]); 

      if (parentId) {
        setNewChildSubTaskText(prev => ({ ...prev, [parentId]: '' }));
        setExpandedStates(prev => ({...prev, [parentId]: true}));
      } else {
        setNewDirectSubTaskText('');
      }
      toast({title: "Sous-tâche ajoutée."})
    } catch (error) {
      console.error("Error adding manual sub-task:", error);
      toast({ title: "Erreur d'ajout", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, newChildSubTaskText, newDirectSubTaskText, currentMainTaskContext, mainTaskInput, allUiTasksFlat, toast, setCurrentMainTaskContext]);

  const toggleSubTaskCompletion = useCallback(async (taskId: string) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    const task = allUiTasksFlat.find(t => t.id === taskId);
    if (!task) return;

    setIsSubmitting(true);
    try {
      const updatedTask = await updateTaskBreakerTask(taskId, { is_completed: !task.is_completed });
      setAllUiTasksFlat(prevFlat => prevFlat.map(t => t.id === taskId ? {...t, ...updatedTask, subTasks: t.subTasks, isExpanded: expandedStates[t.id] || false} : t)); // Preserve subTasks and isExpanded
      toast({ title: task.is_completed ? "Tâche marquée non faite" : "Tâche complétée !" });
    } catch (error) {
      console.error("Error toggling completion:", error);
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
      await fetchTaskData({ preserveActiveState: true });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, allUiTasksFlat, toast, fetchTaskData, expandedStates]);

  const toggleSubTaskExpansion = useCallback((taskId: string) => {
    setExpandedStates(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  }, []);

  const handleDeleteSubTask = useCallback(async (taskId: string) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    setIsSubmitting(true);
    try {
      await deleteTaskBreakerTask(taskId); 
      const idsToDelete = new Set<string>();
      const findDescendants = (currentId: string) => {
        idsToDelete.add(currentId);
        allUiTasksFlat.forEach(t => {
          if (t.parent_id === currentId) findDescendants(t.id);
        });
      };
      findDescendants(taskId);
      setAllUiTasksFlat(prev => prev.filter(t => !idsToDelete.has(t.id)));
      toast({ title: "Tâche et sous-tâches supprimées", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Erreur de suppression", description: (error as Error).message, variant: "destructive" });
      await fetchTaskData({ preserveActiveState: true }); 
    } finally {
      setIsSubmitting(false);
    }
  }, [user, allUiTasksFlat, toast, fetchTaskData]);

  const intensityDescription = () => {
    if (intensity <= 2) return "Le Génie suggérera des étapes générales.";
    if (intensity <= 4) return "Le Génie fournira une décomposition détaillée.";
    return "Le Génie va décortiquer la tâche au maximum !";
  };

  const generateTaskTreeText = (tasksToExport: UITaskBreakerTask[], format: 'txt' | 'md'): string => {
    let output = '';
    const generateNodeText = (node: UITaskBreakerTask) => {
      const indentChar = format === 'md' ? '  ' : '  ';
      const prefix = format === 'md' ? (node.is_completed ? '- [x] ' : '- [ ] ') : (node.is_completed ? '[x] ' : '[ ] ');
      const indentation = indentChar.repeat(node.depth * 2);
      let timeText = '';
      if (showTimeEstimates && node.estimated_time_minutes && node.estimated_time_minutes > 0) {
        timeText = ` (Est: ${formatTime(node.estimated_time_minutes)})`;
      }
      output += `${indentation}${prefix}${node.text}${timeText}\n`;
      const children = allUiTasksFlat.filter(t => t.parent_id === node.id && t.main_task_text_context === node.main_task_text_context).sort((a, b) => a.order - b.order);
      if (children.length > 0) {
        children.forEach(child => generateNodeText(child));
      }
    };
    tasksToExport.forEach(task => generateNodeText(task));
    return output;
  };


  const handleExport = (format: 'txt' | 'md' | 'email') => {
    const mainTaskToExport = currentMainTaskContextRef.current;
    if (!mainTaskToExport.trim() && taskTree.length === 0) {
      toast({title: "Rien à exporter", description: "Veuillez d'abord décomposer une tâche.", variant: "destructive"});
      return;
    }
    let content = '';
    const treeToExport = taskTree.length > 0 ? taskTree : [];
    const mainTaskNameToExport = mainTaskToExport || "Tâche Principale Non Définie";

    if (format === 'md' || format === 'email') {
      content = `# ${mainTaskNameToExport}\n\n`;
      if(treeToExport.length > 0) content += generateTaskTreeText(treeToExport, 'md');
      else content += "_Aucune sous-tâche définie._\n";
    } else {
      content = `${mainTaskNameToExport}\n\n`;
      if(treeToExport.length > 0) content += generateTaskTreeText(treeToExport, 'txt');
      else content += "Aucune sous-tâche définie.\n";
    }

    if (format === 'email') {
      const subject = encodeURIComponent(`Décomposition de tâche : ${mainTaskNameToExport}`);
      const body = encodeURIComponent(content);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      toast({ title: "Préparation de l'email", description: "Votre client email devrait s'ouvrir." });
    } else {
      const fileExtension = format === 'md' ? 'md' : 'txt';
      const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `decomposition-${mainTaskNameToExport ? mainTaskNameToExport.toLowerCase().replace(/\s+/g, '-') : 'tache'}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Exportation réussie!", description: `Fichier ${link.download} téléchargé.`});
    }
  };

  const handleOpenSaveToHistoryDialog = () => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive"}); return; }
    const contextToSave = currentMainTaskContextRef.current;
    if (!contextToSave.trim() && taskTree.length === 0) {
      toast({ title: "Rien à sauvegarder", description: "Décomposez une tâche avant de la sauvegarder.", variant: "destructive"});
      return;
    }
    setCurrentBreakdownName(contextToSave.substring(0, 50) || "Nouvelle Décomposition");
    setSaveToHistoryDialog(true);
  };

  const handleSaveToHistory = async () => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive"}); return; }
    if (!currentBreakdownName.trim()) {
      toast({ title: "Nom requis", description: "Veuillez nommer votre décomposition.", variant: "destructive"});
      return;
    }
    setIsSubmitting(true);
    const contextToSave = currentMainTaskContextRef.current;
    
    const tasksForCurrentContext = allUiTasksFlat.filter(t => t.main_task_text_context === contextToSave);
    const treeToSaveForHistory = buildTree(tasksForCurrentContext, null);

    try {
        const dto: CreateTaskBreakerSavedBreakdownDTO = {
            name: currentBreakdownName,
            main_task_text: contextToSave,
            sub_tasks_json: JSON.stringify(treeToSaveForHistory), 
            intensity_on_save: intensity,
        };
        await addTaskBreakerSavedBreakdown(dto);
        await fetchTaskData({ preserveActiveState: true });
        setSaveToHistoryDialog(false);
        setCurrentBreakdownName('');
        toast({ title: "Sauvegardé dans l'historique!", description: `"${dto.name}" a été ajouté.`});
    } catch (error) {
        console.error("Error saving to history:", error);
        toast({ title: "Erreur de sauvegarde historique", description:(error as Error).message, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const addTasksRecursively = async (tasksToLoad: (PreDecomposedTaskSubTask | UITaskBreakerTask)[], parentDbId: string | null, currentDepth: number, targetContext: string, accumulatedNewExpandedStates: Record<string, boolean>) => {
    const addedTasksBatch: UITaskBreakerTask[] = [];
    for (let i = 0; i < tasksToLoad.length; i++) {
      const taskItem = tasksToLoad[i];
      const taskDto: CreateTaskBreakerTaskDTO = {
        text: taskItem.text,
        parent_id: parentDbId,
        main_task_text_context: targetContext,
        is_completed: (taskItem as UITaskBreakerTask).is_completed || false,
        depth: currentDepth,
        order: i, 
        estimated_time_minutes: (taskItem as UITaskBreakerTask).estimated_time_minutes ?? null,
      };
      const addedDbTask = await addTaskBreakerTask(taskDto);
      const newUiTask = { ...addedDbTask, subTasks: [], isExpanded: true };
      addedTasksBatch.push(newUiTask);
      accumulatedNewExpandedStates[addedDbTask.id] = true;

      const subTasksToLoadNext = (taskItem as PreDecomposedTaskSubTask).subTasks || (taskItem as UITaskBreakerTask).subTasks;
      if (subTasksToLoadNext && subTasksToLoadNext.length > 0) {
        const childTasks = await addTasksRecursively(subTasksToLoadNext, addedDbTask.id, currentDepth + 1, targetContext, accumulatedNewExpandedStates);
        const currentAdded = addedTasksBatch.find(t => t.id === addedDbTask.id);
        if(currentAdded) currentAdded.subTasks = childTasks; 
      }
    }
    return addedTasksBatch; 
  };

  const handleLoadFromHistory = async (entry: TaskBreakerSavedBreakdown) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    setIsSubmitting(true);

    const newMainTaskContext = `${entry.main_task_text} (Historique ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
    const newExpandedStatesForLoad: Record<string, boolean> = {};
    let allLoadedTasksForContext: UITaskBreakerTask[] = [];

    try {
        const parsedSubTasks: UITaskBreakerTask[] = JSON.parse(entry.sub_tasks_json || "[]");
        
        const addAndCollectTasks = async (tasks: UITaskBreakerTask[], parentId: string | null, depth: number): Promise<UITaskBreakerTask[]> => {
            let collected: UITaskBreakerTask[] = [];
            for (let i = 0; i < tasks.length; i++) {
                const taskToLoad = tasks[i];
                const dto: CreateTaskBreakerTaskDTO = {
                    text: taskToLoad.text,
                    parent_id: parentId,
                    main_task_text_context: newMainTaskContext,
                    is_completed: taskToLoad.is_completed || false,
                    depth: depth,
                    order: i, 
                    estimated_time_minutes: taskToLoad.estimated_time_minutes ?? null,
                };
                const addedDbTask = await addTaskBreakerTask(dto);
                newExpandedStatesForLoad[addedDbTask.id] = true; 
                const newUiTask: UITaskBreakerTask = { ...addedDbTask, subTasks: [], isExpanded: true };
                collected.push(newUiTask);

                if (taskToLoad.subTasks && taskToLoad.subTasks.length > 0) {
                    const children = await addAndCollectTasks(taskToLoad.subTasks, addedDbTask.id, depth + 1);
                    newUiTask.subTasks = children;
                    // Avoid double-adding children that are already in the flat list by the recursive call
                    const childIds = new Set(children.map(c => c.id));
                    collected.push(...children.filter(c => !collected.some(coll => coll.id === c.id && !childIds.has(c.id))));

                }
            }
            // Ensure uniqueness by ID before returning
            return Array.from(new Map(collected.map(item => [item.id, item])).values());
        };
        
        allLoadedTasksForContext = await addAndCollectTasks(parsedSubTasks, null, 0);

        if (entry.intensity_on_save) setIntensity(entry.intensity_on_save);

        setExpandedStates(prev => ({ ...prev, ...newExpandedStatesForLoad }));
        setAllUiTasksFlat(prev => [...prev.filter(t => t.main_task_text_context !== newMainTaskContext), ...allLoadedTasksForContext]);
        setCurrentMainTaskContext(newMainTaskContext);
        setMainTaskInput(newMainTaskContext);

        setShowHistoryDialog(false);
        toast({ title: "Chargé depuis l'historique!", description: `"${entry.name}" est prêt.` });
    } catch (error) {
        console.error("Error loading from history:", error);
        toast({ title: "Erreur de chargement historique", description: (error as Error).message, variant: "destructive" });
        await fetchTaskData();
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteFromHistory = async (id: string) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive"}); return; }
    setIsSubmitting(true);
    try {
        await deleteTaskBreakerSavedBreakdown(id);
        await fetchTaskData({ preserveActiveState: true });
        toast({title: "Supprimé de l'historique", variant: "destructive"});
    } catch (error) {
        console.error("Error deleting from history:", error);
        toast({title: "Erreur de suppression historique", description:(error as Error).message, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleLoadTaskSuggestion = (preset: TaskSuggestionPreset) => {
    setMainTaskInput(preset.taskText);
    setCurrentMainTaskContext(''); 
    setAllUiTasksFlat(prev => prev.filter(t => t.main_task_text_context === '')); 
    setTaskTree([]);
    setExpandedStates({});
    mainTaskTextareaRef.current?.focus();
    toast({ title: "Suggestion chargée!", description: `"${preset.name}" prêt à être décomposé.` });
    setShowTaskSuggestionDialog(false);
  };

  const handleLoadDecomposedPreset = async (preset: PreDecomposedTaskPreset) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    setIsSubmitting(true);

    const newMainTaskContext = `${preset.mainTaskText} (Modèle ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
    const newExpandedStatesForLoad: Record<string, boolean> = {};
    let allLoadedTasksForContext: UITaskBreakerTask[] = [];

    try {
        const addAndCollectTasks = async (tasks: PreDecomposedTaskSubTask[], parentId: string | null, depth: number): Promise<UITaskBreakerTask[]> => {
            let collected: UITaskBreakerTask[] = [];
            for (let i = 0; i < tasks.length; i++) {
                const taskToLoad = tasks[i];
                const dto: CreateTaskBreakerTaskDTO = {
                    text: taskToLoad.text,
                    parent_id: parentId,
                    main_task_text_context: newMainTaskContext,
                    is_completed: taskToLoad.is_completed || false,
                    depth: depth,
                    order: i,
                    estimated_time_minutes: null, // Presets don't have time estimates currently
                };
                const addedDbTask = await addTaskBreakerTask(dto);
                newExpandedStatesForLoad[addedDbTask.id] = true;
                const newUiTask: UITaskBreakerTask = { ...addedDbTask, subTasks: [], isExpanded: true };
                collected.push(newUiTask);

                if (taskToLoad.subTasks && taskToLoad.subTasks.length > 0) {
                    const children = await addAndCollectTasks(taskToLoad.subTasks, addedDbTask.id, depth + 1);
                    newUiTask.subTasks = children;
                    const childIds = new Set(children.map(c => c.id));
                    collected.push(...children.filter(c => !collected.some(coll => coll.id === c.id && !childIds.has(c.id))));
                }
            }
            return Array.from(new Map(collected.map(item => [item.id, item])).values());
        };
        
        allLoadedTasksForContext = await addAndCollectTasks(preset.subTasks, null, 0);

        setExpandedStates(prev => ({ ...prev, ...newExpandedStatesForLoad }));
        setAllUiTasksFlat(prev => [...prev.filter(t => t.main_task_text_context !== newMainTaskContext), ...allLoadedTasksForContext]);
        setCurrentMainTaskContext(newMainTaskContext);
        setMainTaskInput(newMainTaskContext);

        setShowDecomposedPresetDialog(false);
        toast({ title: "Tâche décomposée chargée!", description: `Modèle "${preset.name}" appliqué.` });
        mainTaskTextareaRef.current?.focus();
    } catch (error) {
        console.error("Error loading decomposed preset:", error);
        toast({ title: "Erreur chargement modèle", description: (error as Error).message, variant: "destructive" });
         await fetchTaskData();
    } finally {
        setIsSubmitting(false);
    }
};

 const handleClearCurrentTask = async () => {
    if (!user) {
      toast({ title: "Non connecté", variant: "destructive"});
      setShowClearTaskDialog(false);
      return;
    }

    const contextToDelete = currentMainTaskContextRef.current;
    const mainInputText = mainTaskInputRef.current.trim();

    if (!contextToDelete && !mainInputText) {
      toast({ title: "Rien à effacer", description: "Aucune tâche principale ou décomposition active.", variant: "default"});
      setShowClearTaskDialog(false);
      return;
    }

    setIsSubmitting(true);
    try {
      if (contextToDelete) {
          const rootTasksInContext = allUiTasksFlat.filter(
            t => t.main_task_text_context === contextToDelete && t.parent_id === null
          );

          for (const task of rootTasksInContext) {
            await deleteTaskBreakerTask(task.id); 
          }
          setAllUiTasksFlat(prev => prev.filter(t => t.main_task_text_context !== contextToDelete));
      }
      setMainTaskInput('');
      setCurrentMainTaskContext('');
      setTaskTree([]); 
      setExpandedStates({});

      setShowClearTaskDialog(false);
      toast({ title: "Tâche actuelle effacée", variant: "destructive"});
      mainTaskTextareaRef.current?.focus();

    } catch (error) {
      console.error("Error clearing current task:", error);
      toast({ title: "Erreur d'effacement", description:(error as Error).message, variant: "destructive"});
      await fetchTaskData({preserveActiveState: false});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSaveCustomPresetDialog = () => {
    if (!user) { toast({ title: "Non connecté", description: "Connectez-vous pour mémoriser des modèles.", variant: "destructive"}); return; }
    if (!mainTaskInputRef.current.trim()) {
      toast({title: "Tâche principale vide", description: "Écrivez d'abord une tâche principale à mémoriser.", variant: "destructive"});
      return;
    }
    setNewCustomPresetNameInput(mainTaskInputRef.current.substring(0, 50));
    setShowSaveCustomPresetDialog(true);
  };

  const handleSaveCustomPreset = async () => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive"}); return; }
    if (!newCustomPresetNameInput.trim()) {
       toast({title: "Nom de modèle requis", variant: "destructive"});
       return;
    }
    setIsSubmitting(true);
    try {
        const dto: CreateTaskBreakerCustomPresetDTO = {
            name: newCustomPresetNameInput,
            task_text: mainTaskInputRef.current,
        };
        await addTaskBreakerCustomPreset(dto);
        await fetchTaskData({ preserveActiveState: true });
        setShowSaveCustomPresetDialog(false);
        setNewCustomPresetNameInput('');
        toast({title: "Modèle de tâche mémorisé!", description: `"${dto.name}" ajouté.`});
    } catch (error) {
        console.error("Error saving custom preset:", error);
        toast({title: "Erreur de mémorisation", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteCustomPreset = async (idToDelete: string) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive"}); return; }
    setIsSubmitting(true);
    try {
        await deleteTaskBreakerCustomPreset(idToDelete);
        await fetchTaskData({ preserveActiveState: true });
        toast({title: "Modèle personnalisé supprimé", variant: "destructive"});
    } catch (error) {
        console.error("Error deleting custom preset:", error);
        toast({title: "Erreur de suppression", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const groupedSystemSuggestions = systemTaskSuggestions.reduce((acc, preset) => {
    if (!acc[preset.category]) acc[preset.category] = [];
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, TaskSuggestionPreset[]>);

  const groupedPreDecomposedPresets = preDecomposedTaskPresets.reduce((acc, preset) => {
    if (!acc[preset.category]) acc[preset.category] = [];
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, PreDecomposedTaskPreset[]>);

  const calculateProgress = useCallback((task: UITaskBreakerTask): { completedLeaves: number, totalLeaves: number } => {
    let completedLeaves = 0;
    let totalLeaves = 0;
    const children = allUiTasksFlat.filter(t => t.parent_id === task.id && t.main_task_text_context === task.main_task_text_context);

    if (children.length === 0) { 
        totalLeaves = 1;
        if (task.is_completed) {
            completedLeaves = 1;
        }
    } else {
        children.forEach(child => {
            const childProgress = calculateProgress(child); // Pass the child task itself
            completedLeaves += childProgress.completedLeaves;
            totalLeaves += childProgress.totalLeaves;
        });
    }
    return { completedLeaves, totalLeaves };
  }, [allUiTasksFlat]);

  const formatTime = (totalMinutes: number | null | undefined): string => {
    if (totalMinutes === null || totalMinutes === undefined || totalMinutes <= 0) return '';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim();
  };

  const calculateTotalEstimatedTime = useCallback((taskId: string): number => {
    const task = allUiTasksFlat.find(t => t.id === taskId);
    if (!task) return 0;

    const children = allUiTasksFlat.filter(t => t.parent_id === taskId && t.main_task_text_context === task.main_task_text_context);

    if (children.length === 0) { 
        return task.estimated_time_minutes || 0;
    }
    
    let childrenHaveEstimates = false;
    let sumOfChildren = 0;
    for(const child of children) {
        const childTotalTime = calculateTotalEstimatedTime(child.id);
        if (childTotalTime > 0) {
            childrenHaveEstimates = true;
        }
        sumOfChildren += childTotalTime;
    }

    // If children have estimates, return their sum. Otherwise, return the parent's own estimate (if any).
    if (childrenHaveEstimates) {
        return sumOfChildren;
    } else {
        return task.estimated_time_minutes || 0;
    }
  }, [allUiTasksFlat]);


  const overallProgress = useMemo(() => {
    if (toolMode !== 'genie' || taskTree.length === 0) {
      return { completedLeaves: 0, totalLeaves: 0, percentage: 0 };
    }
    let totalCompletedLeaves = 0;
    let totalOverallLeaves = 0;
    taskTree.forEach(rootTask => {
      const progress = calculateProgress(rootTask);
      totalCompletedLeaves += progress.completedLeaves;
      totalOverallLeaves += progress.totalLeaves;
    });
    const percentage = totalOverallLeaves > 0 ? (totalCompletedLeaves / totalOverallLeaves) * 100 : 0;
    return { completedLeaves: totalCompletedLeaves, totalLeaves: totalOverallLeaves, percentage };
  }, [toolMode, taskTree, calculateProgress]);

  const overallEstimatedTime = useMemo(() => {
    if (toolMode !== 'genie' || !showTimeEstimates || taskTree.length === 0) return 0;
    let total = 0;
    taskTree.forEach(rootTask => {
        total += calculateTotalEstimatedTime(rootTask.id);
    });
    return total;
  }, [toolMode, showTimeEstimates, taskTree, calculateTotalEstimatedTime]);


  return (
    <TooltipProvider>
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div className="flex-grow">
            <CardTitle className="text-3xl font-bold text-primary mb-1">Décomposeur de Tâches Magique</CardTitle>
            <CardDescription>
              Décomposez vos tâches complexes. Le Génie vous aide à voir plus clair, niveau par niveau !
              {user ? (isOnline ? " Vos tâches et modèles sont synchronisés." : " Mode hors ligne, données sauvegardées localement.") : " Connectez-vous pour sauvegarder et synchroniser."}
            </CardDescription>
          </div>
          <div className="w-full md:w-auto md:min-w-[300px] md:max-w-xs lg:max-w-sm shrink-0 space-y-2">
            <IntensitySelector value={intensity} onChange={setIntensity} />
            <div className="flex items-center justify-between p-1 bg-muted/50 rounded-md">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setToolMode('magique')} className={toolMode === 'magique' ? 'bg-primary/20' : ''}>
                            <Sparkles className={`h-5 w-5 ${toolMode === 'magique' ? 'text-primary' : 'text-muted-foreground'}`} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Mode Magique (Décomposition IA simple)</p></TooltipContent>
                </Tooltip>
                <Switch
                    checked={toolMode === 'genie'}
                    onCheckedChange={(checked) => setToolMode(checked ? 'genie' : 'magique')}
                    aria-label="Changer de mode"
                />
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => setToolMode('genie')} className={toolMode === 'genie' ? 'bg-primary/20' : ''}>
                            <BrainCircuit className={`h-5 w-5 ${toolMode === 'genie' ? 'text-primary' : 'text-muted-foreground'}`} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Mode Génie (Fonctionnalités Avancées: Progrès, Estimations)</p></TooltipContent>
                </Tooltip>
                {toolMode === 'genie' && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setShowTimeEstimates(prev => !prev)} className={showTimeEstimates ? 'bg-primary/20' : ''}>
                                <ClockIcon className={`h-5 w-5 ${showTimeEstimates ? 'text-primary' : 'text-muted-foreground'}`} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{showTimeEstimates ? "Masquer" : "Afficher"} les estimations de temps</p></TooltipContent>
                    </Tooltip>
                )}
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-6">

        {!user && (
            <Card className="p-6 bg-yellow-50 border-yellow-300 text-yellow-700 text-center">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p className="font-semibold">Connectez-vous pour décomposer et sauvegarder vos tâches et modèles.</p>
            </Card>
        )}

        {user && (
          <>
            <div>
              <div className="flex items-center mb-1">
                <Label htmlFor="main-task" className="block text-sm font-medium text-foreground">Tâche principale à décomposer :</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 p-0" type="button"><Info className="h-3 w-3"/></Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Entrez ici la tâche globale que vous souhaitez diviser en étapes plus petites. Le Génie utilisera ce texte comme base pour ses suggestions.</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-2 items-center">
                <Textarea
                  ref={mainTaskTextareaRef}
                  id="main-task"
                  value={mainTaskInput}
                  onChange={(e) => setMainTaskInput(e.target.value)}
                  placeholder="Ex: Planifier un voyage épique"
                  className="flex-grow"
                  rows={2}
                  disabled={isLoadingAI || isListening || isSubmitting || isLoadingData}
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleVoiceInput}
                        className={`${isListening ? 'text-red-500 animate-pulse' : ''} self-start`}
                        aria-label={isListening ? "Arrêter l'écoute" : "Dicter la tâche principale"}
                        disabled={isLoadingAI || isSubmitting || isLoadingData || !recognitionRef.current}
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Cliquez pour dicter votre tâche principale. Votre navigateur vous demandera l'autorisation d'utiliser le microphone.</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleGenieBreakdown(mainTaskInputRef.current, null)} disabled={isLoadingAI || !mainTaskInputRef.current.trim() || isListening || isSubmitting || isLoadingData || (isLoadingAI && loadingAITaskId !== null)} className="mt-2">
                        {(isLoadingAI && loadingAITaskId === null) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Décomposer Tâche Principale
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Le Génie analysera la tâche principale ci-dessus et suggérera des sous-tâches en fonction du niveau d'Énergie Magique sélectionné. Les sous-tâches existantes (si le contexte est le même) seront conservées.</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {toolMode === 'genie' && currentMainTaskContext && taskTree.length > 0 && (
                <div className="mt-3 mb-1 p-2 border rounded-md bg-muted/30">
                    <Label className="text-sm font-medium text-foreground">Progression Globale: {currentMainTaskContext}</Label>
                    <Progress value={overallProgress.percentage} className="w-full h-2.5 mt-1 mb-0.5" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{overallProgress.completedLeaves}/{overallProgress.totalLeaves} tâches ultimes complétées ({Math.round(overallProgress.percentage)}%)</span>
                        {showTimeEstimates && overallEstimatedTime > 0 && (
                            <span>Temps total estimé: {formatTime(overallEstimatedTime)}</span>
                        )}
                    </div>
                </div>
            )}


            { (currentMainTaskContext || taskTree.length > 0 || isLoadingData) && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground mt-4">
                  {currentMainTaskContext ? `Décomposition pour : "${currentMainTaskContext}"` : ""}
                </h3>
                {isLoadingData && <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Chargement des tâches...</span></div>}

                {!isLoadingData && taskTree.length === 0 && !isLoadingAI && currentMainTaskContext && (
                    <p className="text-muted-foreground italic">Aucune sous-tâche. Cliquez sur "Décomposer" ou ajoutez-en manuellement ci-dessous.</p>
                )}
                 {!isLoadingData && taskTree.length === 0 && !isLoadingAI && !currentMainTaskContext && (
                    <p className="text-muted-foreground italic text-center py-4">Entrez une tâche principale ci-dessus ou chargez un modèle pour commencer.</p>
                )}
                {(!isLoadingData && (isLoadingAI && loadingAITaskId === null && taskTree.length === 0)) && (
                    <div className="flex items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin"/> Le Génie décompose la tâche principale...
                    </div>
                )}

                {!isLoadingData && taskTree.length > 0 && (
                  <ScrollArea className="max-h-[500px] overflow-y-auto pr-2 rounded-md border p-2 bg-muted/20">
                    {taskTree.map((taskNode) => (
                       <MemoizedRenderTaskNode
                        key={taskNode.id}
                        task={taskNode}
                        toolMode={toolMode}
                        showTimeEstimates={showTimeEstimates}
                        isLoadingAI={isLoadingAI}
                        loadingAITaskId={loadingAITaskId}
                        isSubmitting={isSubmitting}
                        user={user}
                        newChildSubTaskText={newChildSubTaskText}
                        expandedStates={expandedStates}
                        allUiTasksFlat={allUiTasksFlat}
                        onToggleExpansion={toggleSubTaskExpansion}
                        onToggleCompletion={toggleSubTaskCompletion}
                        onDebouncedChange={handleDebouncedChange}
                        onGenieBreakdown={handleGenieBreakdown}
                        onAddManualSubTask={handleAddManualSubTask}
                        onDeleteSubTask={handleDeleteSubTask}
                        setNewChildSubTaskText={setNewChildSubTaskText}
                        textDebounceTimeouts={textDebounceTimeouts}
                        timeEstimateDebounceTimeouts={timeEstimateDebounceTimeouts}
                        calculateProgress={calculateProgress}
                        formatTime={formatTime}
                        calculateTotalEstimatedTime={calculateTotalEstimatedTime}
                      />
                    ))}
                  </ScrollArea>
                )}

                {!isLoadingData && currentMainTaskContext && (
                  <div className="mt-4 flex gap-2 items-center">
                    <Label htmlFor="add-direct-subtask" className="sr-only">Ajouter une sous-tâche directe à {currentMainTaskContext}</Label>
                    <Input
                      id="add-direct-subtask"
                      value={newDirectSubTaskText}
                      onChange={(e) => setNewDirectSubTaskText(e.target.value)}
                      placeholder="Ajouter une sous-tâche manuellement à la tâche principale"
                      className="flex-grow"
                      onKeyPress={(e) => {if (e.key === 'Enter' && !isLoadingAI && !isSubmitting && newDirectSubTaskText.trim()) handleAddManualSubTask(null);}}
                      disabled={isLoadingAI || isSubmitting || !user}
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={() => handleAddManualSubTask(null)} variant="outline" disabled={isLoadingAI || isSubmitting || !newDirectSubTaskText.trim() || !user}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Ajoute manuellement le texte saisi comme une sous-tâche directe de la tâche principale affichée.</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-8 pt-6 border-t flex flex-wrap justify-center items-center gap-3">
            <TooltipProvider>
                <Dialog open={showTaskSuggestionDialog} onOpenChange={setShowTaskSuggestionDialog}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                                <Button variant="outline" disabled={!user || isLoadingData || isSubmitting || isLoadingAI}><ListChecks className="mr-2 h-4 w-4" /> Suggestions de Tâches</Button>
                            </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Ouvre une liste de tâches prédéfinies ou vos modèles. Sélectionner une tâche la chargera dans le champ 'Tâche principale'.</p></TooltipContent>
                    </Tooltip>
                    <DialogContent className="sm:max-w-lg md:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Suggestions de Tâches</DialogTitle>
                            <DialogDescription>Choisissez une idée de tâche pour démarrer ou un de vos modèles mémorisés.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[50vh] pr-3">
                            <Accordion type="multiple" defaultValue={['Mes Tâches Mémorisées', ...Object.keys(groupedSystemSuggestions)]} className="w-full">
                                <AccordionItem value="Mes Tâches Mémorisées">
                                    <AccordionTrigger>Mes Tâches Mémorisées ({customCommonPresets.length})</AccordionTrigger>
                                    <AccordionContent>
                                        {isLoadingData && <Loader2 className="h-5 w-5 animate-spin mx-auto my-2"/>}
                                        {!isLoadingData && customCommonPresets.length === 0 && <p className="text-sm text-muted-foreground p-2">Aucun modèle personnalisé.</p>}
                                        {!isLoadingData && customCommonPresets.map(preset => (
                                            <div key={preset.id} className="flex items-center justify-between py-2 hover:bg-accent/50 rounded-md px-2">
                                                <Button variant="ghost" className="flex-grow justify-start text-left h-auto" onClick={() => { handleLoadTaskSuggestion({id: preset.id, name: preset.name, taskText: preset.task_text, category: "Custom" }); setShowTaskSuggestionDialog(false); }}>
                                                    {preset.name}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteCustomPreset(preset.id)} className="h-7 w-7" disabled={isSubmitting}>
                                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                                </Button>
                                            </div>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                                {Object.entries(groupedSystemSuggestions).map(([category, presets]) => (
                                    <AccordionItem value={category} key={category}>
                                        <AccordionTrigger>{category} ({presets.length})</AccordionTrigger>
                                        <AccordionContent>
                                            {presets.map(preset => (
                                                <Button key={preset.id} variant="ghost" className="w-full justify-start text-left h-auto py-2 hover:bg-accent/50 rounded-md px-2" onClick={() => {handleLoadTaskSuggestion(preset); setShowTaskSuggestionDialog(false);}}>
                                                    {preset.name}
                                                </Button>
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </ScrollArea>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Fermer</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </TooltipProvider>

            <TooltipProvider>
                <Dialog open={showDecomposedPresetDialog} onOpenChange={setShowDecomposedPresetDialog}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                                <Button variant="outline" disabled={!user || isLoadingData || isSubmitting || isLoadingAI}><BrainCircuit className="mr-2 h-4 w-4" /> Charger Tâche Décomposée</Button>
                            </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Ouvre une liste de modèles de tâches déjà décomposées. Sélectionner un modèle chargera sa structure.</p></TooltipContent>
                    </Tooltip>
                    <DialogContent className="sm:max-w-lg md:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Charger un Modèle de Tâche Décomposée</DialogTitle>
                            <DialogDescription>Choisissez un modèle de tâche déjà décomposée pour commencer rapidement.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[50vh] pr-3">
                            <Accordion type="multiple" defaultValue={Object.keys(groupedPreDecomposedPresets)} className="w-full">
                                {Object.entries(groupedPreDecomposedPresets).map(([category, presets]) => (
                                    <AccordionItem value={category} key={category}>
                                        <AccordionTrigger>{category} ({presets.length})</AccordionTrigger>
                                        <AccordionContent>
                                            {presets.map(preset => (
                                                <Button key={preset.id} variant="ghost" className="w-full justify-start text-left h-auto py-2 hover:bg-accent/50 rounded-md px-2" onClick={() => {handleLoadDecomposedPreset(preset); setShowDecomposedPresetDialog(false);}}>
                                                    {preset.name}
                                                </Button>
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </ScrollArea>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Fermer</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" onClick={handleOpenSaveCustomPresetDialog} disabled={!user || !mainTaskInputRef.current.trim() || isLoadingData || isSubmitting || isLoadingAI}>
                            <BookmarkPlus className="mr-2 h-4 w-4" /> Mémoriser Tâche
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Sauvegarde le texte actuel de la 'Tâche principale' comme un modèle réutilisable.</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" onClick={handleOpenSaveToHistoryDialog} disabled={!user || (!currentMainTaskContextRef.current.trim() && taskTree.length === 0) || isLoadingData || isSubmitting || isLoadingAI}>
                            <Save className="mr-2 h-4 w-4" /> Sauvegarder Décomposition
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Sauvegarde la tâche principale actuelle ET toute sa structure de sous-tâches dans votre historique.</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                                <Button variant="outline" disabled={isLoadingData || isSubmitting || isLoadingAI || !user}><History className="mr-2 h-4 w-4" /> Historique ({history.length})</Button>
                            </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Affiche la liste de vos décompositions précédemment sauvegardées.</p></TooltipContent>
                    </Tooltip>
                    <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
                        <DialogHeader><DialogTitle>Historique des Décompositions</DialogTitle></DialogHeader>
                        <ScrollArea className="h-[60vh] pr-3">
                            {isLoadingData && <Loader2 className="h-5 w-5 animate-spin mx-auto my-2"/>}
                            {!isLoadingData && history.length === 0 && <p className="text-muted-foreground text-center py-4">Votre historique est vide.</p>}
                            <div className="space-y-3">
                            {!isLoadingData && history.map(entry => (
                                <Card key={entry.id} className="p-3">
                                    <CardHeader className="p-0 pb-2"><CardTitle className="text-base">{entry.name}</CardTitle></CardHeader>
                                    <CardContent className="p-0 pb-2">
                                        <p className="text-xs text-muted-foreground truncate">Tâche principale : {entry.main_task_text}</p>
                                        <p className="text-xs text-muted-foreground">Sauvegardé le : {new Date(entry.created_at).toLocaleDateString()}</p>
                                    </CardContent>
                                    <CardFooter className="p-0 flex justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => {handleLoadFromHistory(entry);}} disabled={isSubmitting}>Charger</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteFromHistory(entry.id)} disabled={isSubmitting}>Supprimer</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                            </div>
                        </ScrollArea>
                        <DialogFooter> <DialogClose asChild><Button type="button" variant="secondary">Fermer</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>
            </TooltipProvider>

            <TooltipProvider>
                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" disabled={!user || (!currentMainTaskContextRef.current.trim() && taskTree.length === 0) || isLoadingData || isSubmitting || isLoadingAI}><Download className="mr-2 h-4 w-4" /> Exporter</Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Permet d'exporter la décomposition actuelle sous différents formats.</p></TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Options d'Export</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleExport('txt')}>Fichier Texte (.txt)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('md')}>Fichier Markdown (.md)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('email')}><Mail className="mr-2 h-4 w-4" /> Envoyer par Email</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TooltipProvider>

            <TooltipProvider>
                <AlertDialog open={showClearTaskDialog} onOpenChange={setShowClearTaskDialog}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={!user || (!currentMainTaskContextRef.current.trim() && taskTree.length === 0 && mainTaskInputRef.current === '') || isLoadingData || isSubmitting || isLoadingAI}>
                                    <Eraser className="mr-2 h-4 w-4" /> Effacer Tâche Actuelle
                                </Button>
                            </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Supprime la tâche principale actuellement affichée et toutes ses sous-tâches. Une confirmation sera demandée.</p></TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action effacera la tâche principale et toutes ses sous-tâches de la base de données et localement. Cette action est irréversible.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearCurrentTask}>Oui, effacer</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TooltipProvider>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
            Une tâche bien décomposée est une tâche à moitié terminée !
        </p>
      </CardFooter>

       <Dialog open={saveToHistoryDialog} onOpenChange={setSaveToHistoryDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Sauvegarder la Décomposition</DialogTitle>
                <DialogDescription>Donnez un nom à cette décomposition pour la retrouver plus tard dans l'historique.</DialogDescription>
            </DialogHeader>
            <div className="py-2">
                <Label htmlFor="breakdownName">Nom de la décomposition</Label>
                <Input
                id="breakdownName"
                value={currentBreakdownName}
                onChange={(e) => setCurrentBreakdownName(e.target.value)}
                placeholder="Ex: Organisation Voyage Japon Été 2025"
                />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                <Button onClick={handleSaveToHistory} disabled={!currentBreakdownName.trim() || isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                    Sauvegarder
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveCustomPresetDialog} onOpenChange={setShowSaveCustomPresetDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mémoriser la Tâche Principale</DialogTitle>
                <DialogDescription>Donnez un nom à ce modèle de tâche pour le réutiliser facilement.</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-2">
                <div>
                    <Label htmlFor="customPresetName">Nom du modèle</Label>
                    <Input
                    id="customPresetName"
                    value={newCustomPresetNameInput}
                    onChange={(e) => setNewCustomPresetNameInput(e.target.value)}
                    placeholder="Ex: Rapport Mensuel, Planification Repas"
                    disabled={isSubmitting}
                    />
                </div>
                <div>
                    <Label>Tâche à mémoriser :</Label>
                    <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">{mainTaskInputRef.current || "Aucune tâche principale définie."}</p>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Annuler</Button></DialogClose>
                <Button onClick={handleSaveCustomPreset} disabled={isSubmitting || !newCustomPresetNameInput.trim() || !mainTaskInputRef.current.trim()}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                  Mémoriser
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </TooltipProvider>
  );
}


    