import type { SiteContent } from './types';

const fr: SiteContent = {
  meta: {
    title: 'effract — écrivez vos composants React comme des programmes Effect',
    description:
      'Écrivez vos composants React comme des programmes Effect. Un composant, un seul mount, en SPA, en SSR ou comme React Server Component — serveur ou client n’est qu’un détail de runtime.',
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
      'Le même composant, le même mount, en SPA, en SSR ou comme React Server Component — serveur ou client n’est qu’un [[détail de runtime]].',
    ctaPrimary: 'Lire la doc',
    ctaSecondary: 'Star sur GitHub',
    installNote: 'MIT · React 19+ · Effect v4 · ~1.7 ko',
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
      { write: 'un échec typé', does: 'affiche une vue de repli via .catch' },
    ],
  },
  everywhere: {
    label: 'Un composant, un seul mount, tous les runtimes',
    title: 'Vous ne tapez jamais « serveur » ou « client »',
    body: 'Le même mount(layer, Root), depuis le même package, dans chaque fichier. Dans un graphe RSC, le bundler lui donne une implémentation serveur — aucun JS client ; ailleurs il s’affiche de façon interactive. Le composant [[ne change jamais]] ; seul l’endroit où vous le mount change.',
    runtimes: [
      { name: 'SPA', desc: 'Vite, dans le navigateur' },
      { name: 'SSR', desc: 'Bun / Node en flux' },
      { name: 'Start', desc: 'TanStack Start' },
      { name: 'RSC', desc: 'Next.js, sans JS client' },
    ],
    caption: 'Les mêmes RECs dans les quatre — démontré par les apps d’exemple.',
  },
  typedErrors: {
    label: 'Erreurs typées',
    title: 'Chaque échec a un visage',
    body: 'Les échecs d’un REC vivent dans son type. [[.catch les transforme en UI]] — une vue de repli par tag d’erreur, vérifiée de façon exhaustive. Sans try/catch, sans error instanceof, sans boundary non typée. En synchrone ou async, côté client ou serveur.',
    caption: 'Oubliez un cas et [[ça ne compile pas]] — le canal d’erreurs vous garde honnête.',
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
        desc: 'La même valeur devient un [[Server Component async]] avec le même mount — un seul package, aucune forme serveur distincte, aucun JS client.',
      },
      {
        title: 'Léger, et jamais en double',
        desc: 'Le cœur client fait ~1.7 ko min+gzip. React et Effect restent des peers (la copie de votre app) — [[jamais embarqués ni livrés deux fois]], même entre versions mineures.',
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
