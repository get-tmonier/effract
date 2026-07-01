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
      'Votre état et votre logique vivent dans des services Effect — React n’est que la [[couche de rendu]]. Un composant, un seul mount, en SPA, en SSR ou comme React Server Component.',
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
    caption: 'Un service, son état lu de façon réactive — [[vérifié à la compilation]].',
  },
  thesis: {
    label: 'La thèse',
    title: 'Deux fibres, un composant',
    body: 'React et Effect ordonnancent tous deux sur des fibres. effract pilote le générateur d’un composant dans la passe de rendu de React — un seul flux de yield* pour les deux. [[Du React 100 % réel, sans réconciliateur remplacé]].',
    rows: [
      { write: 'yield* Cart', does: 'un service, résolu de façon synchrone' },
      { write: 'yield* cart.total', does: 'état réactif — lecture + abonnement' },
      { write: 'yield* query(data, id)', does: 'suspend ; chargement suivi par le type' },
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
  loading: {
    label: 'Le chargement, géré',
    title: 'Un état de chargement qu’on ne peut pas oublier',
    body: 'Les données async passent par [[query]] — il suspend le rendu, refait la requête quand la clé change et interrompt sa fibre au démontage. Et, comme .catch pour les erreurs, il inscrit une obligation de chargement dans le type : mount [[ne compile pas]] tant que vous ne la traitez pas, avec .suspense(fallback) ou { loading }. Retries et timeouts sont de simples combinateurs Effect.',
    caption: 'L’obligation remonte jusqu’à la racine — une seule boundary couvre le sous-arbre.',
  },
  philosophy: {
    label: 'L’idée',
    title: 'La logique dans Effect, React pour le rendu',
    body: 'Un composant React doit être [[presque banal]] — structure et interaction, rien de plus. L’état, et la logique qui va avec, vivent [[hors de React]], dans des services Effect ; le composant lit un résultat typé avec yield* et l’affiche. Pas de useState, pas de logique dans l’arbre.',
    caption: 'Toute la logique — état, dérivation, mutation — dans un seul service. Le composant ne fait que [[lire et afficher]].',
    points: [
      {
        title: 'L’état et la logique dans les services',
        desc: 'Atomes, dérivation (derive), retries, concurrence, cache — le travail d’Effect, dans des services hors de l’arbre de rendu. Testable sans React ; réutilisable partout.',
      },
      {
        title: 'Le composant ne fait qu’afficher',
        desc: 'Il lit l’état avec yield* et déclenche des événements. Rien à mémoïser, aucun hook en cascade — le corps se lit de haut en bas, trop mince pour mériter un test.',
      },
      {
        title: 'Universel par construction',
        desc: 'Un service tourne en SPA, en SSR, dans une fibre de fond, ou sur le serveur pour un RSC — son état est accessible partout où tourne un Effect.',
      },
      {
        title: 'Une primitive, pas un zoo',
        desc: 'Remisez useState, useEffect, une lib de fetch, le context, un store, les server actions — un seul yield* les couvre.',
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
    body: 'MIT, sur npm. Commencez par la doc, ou les neuf recettes de call site.',
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
