import type { SiteContent } from './types';

const fr: SiteContent = {
  meta: {
    title: 'effract — écrivez vos composants React comme des programmes Effect',
    description:
      'Écrivez vos composants React comme des programmes Effect. Un composant tourne en SPA, sur un serveur, dans un Web Worker ou comme RSC — serveur ou client n’est qu’un détail de runtime.',
  },
  nav: {
    thesis: 'Thèse',
    everywhere: 'Partout',
    features: 'Atouts',
    docs: 'Docs',
  },
  hero: {
    eyebrow: 'React natif Effect',
    titleLead: 'Vos composants React, écrits comme des',
    titleGradient: 'programmes Effect.',
    subtitle:
      'Le même composant tourne en SPA, sur un serveur, dans un Web Worker ou comme RSC — serveur ou client n’est qu’un [[détail de runtime]].',
    ctaPrimary: 'Lire la doc',
    ctaSecondary: 'Star sur GitHub',
    installNote: 'MIT · React 19.2+ · Effect v4',
  },
  weave: {
    react: 'Fibres React',
    effect: 'Fibres Effect',
    aria: 'Des fibres React et des fibres Effect tressées en un seul composant',
    caption: 'Deux fibres, tissées en une passe de rendu —',
    captionEnd: 'parlent les deux.',
  },
  callsite: {
    caption: 'Un service et un vrai hook React dans un seul corps — [[vérifié à la compilation]].',
  },
  thesis: {
    label: 'La thèse',
    title: 'Deux fibres, un composant',
    body: 'React et Effect ordonnancent tous deux sur des fibres. effract pilote le générateur d’un composant dans la passe de rendu de React — un seul flux de yield* pour les deux. [[Du React 100 % réel, sans réconciliateur remplacé]].',
    rows: [
      { write: 'yield* Stats', does: 'un service, résolu de façon synchrone' },
      { write: 'yield* hook(useState(0))', does: 'un vrai hook React, ordre stable' },
      { write: 'yield* fetchUser', does: 'suspend, puis reprend sur place' },
      { write: 'une erreur', does: 'remonte à l’error boundary la plus proche' },
    ],
  },
  everywhere: {
    label: 'Un composant, tous les runtimes',
    title: 'Serveur ou client : un simple mount(...)',
    body: 'Layer navigateur → SPA. Layer serveur → SSR en flux. Moteur Flight → RSC. Le composant [[ne change jamais]] ; seul le runtime sous lui change.',
    runtimes: [
      { name: 'SPA', desc: 'Vite, dans le navigateur' },
      { name: 'SSR', desc: 'Bun / Node en flux' },
      { name: 'Web Worker', desc: 'hors du thread principal' },
      { name: 'RSC', desc: 'Flight, en flux' },
    ],
    caption: 'Les mêmes RECs dans les quatre — démontré par les apps d’exemple.',
  },
  philosophy: {
    label: 'Philosophie',
    title: 'Gardez la couche de rendu ennuyeuse',
    body: 'Un composant React doit être [[presque banal]] — structure et interaction, rien de plus. Le difficile vit [[hors de React]], résolu au point de composition et remis à votre JSX en résultat typé.',
    points: [
      {
        title: 'Le difficile vit dans Effect',
        desc: 'Retries, concurrence, cache, tracing — le travail d’Effect, hors de l’arbre de rendu, testable et réutilisable.',
      },
      {
        title: 'La composition async devient triviale',
        desc: 'Plus d’états de chargement ni de hooks en cascade. Tout est résolu avant le rendu ; le corps se lit de haut en bas.',
      },
      {
        title: 'La bonne idée des RSC, sans le serveur',
        desc: 'Le vrai intérêt des RSC : résoudre les dépendances à la racine de composition. effract le garde, sans le verrou.',
      },
      {
        title: 'Une primitive, pas un zoo',
        desc: 'Remisez useEffect, une lib de fetch, le context, un store, les server actions — un seul yield* couvre les trois.',
      },
    ],
  },
  features: {
    label: 'Pourquoi effract',
    title: 'Le call site, avant tout',
    items: [
      {
        title: 'Incrémental, pas une réécriture',
        desc: 'Les composants ordinaires [[restent du]] <Component /> JSX. Un REC seulement là où il faut un service.',
      },
      {
        title: 'Du vrai React, de bout en bout',
        desc: 'Hooks, Suspense, error boundaries, hydratation, RSC — [[tout fonctionne]]. effract rend à travers React.',
      },
      {
        title: 'Les services, en synchrone',
        desc: 'Lire un service est une [[lecture de Context]], pas un aller-retour async. Aucun Effect.runSync au call site.',
      },
      {
        title: 'Des signaux sans cérémonie',
        desc: 'observe($ => $(count) * 2) re-rend [[exactement quand]] un atom lu change. Sans provider, sans sélecteurs.',
      },
      {
        title: 'RSC, nativement',
        desc: 'Le même corps devient un [[Server Component async]] et émet du Flight standard.',
      },
      {
        title: 'Typé de bout en bout',
        desc: 'Besoins et erreurs sont inférés depuis vos yield — [[mount ne compile pas sans eux]].',
      },
    ],
  },
  cta: {
    title: 'Écrivez-le une fois. Exécutez-le partout où tourne un runtime.',
    body: 'MIT, sur npm. Commencez par la doc, ou les huit recettes de call site.',
    primary: 'Commencer',
    secondary: 'Voir sur GitHub',
  },
  footer: {
    tagline: 'Des composants React, écrits comme des programmes Effect.',
    builtBy: 'Conçu par Damien Meur',
    docs: 'Docs',
    npm: 'npm',
  },
};

export default fr;
