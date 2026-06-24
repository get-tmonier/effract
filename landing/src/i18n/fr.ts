import type { SiteContent } from './types';

const fr: SiteContent = {
  meta: {
    title: 'effract — écrivez vos composants React comme des programmes Effect',
    description:
      'effract est un framework React natif Effect. Écrivez un composant une fois ; le même composant tourne en SPA, sur un serveur, dans un Web Worker, ou comme React Server Component. « Serveur ou client » devient un détail de runtime Effect.',
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
      'Le même composant tourne en SPA, sur un serveur, dans un Web Worker, ou comme React Server Component. « Serveur ou client » n’est plus une bifurcation d’architecture, mais un simple détail de runtime Effect.',
    ctaPrimary: 'Lire la doc',
    ctaSecondary: 'Star sur GitHub',
    installNote: 'MIT · React 19.2+ · Effect v4',
  },
  thesis: {
    label: 'La thèse',
    title: 'Deux fibres, un composant',
    body: 'React ordonnance son travail sur des fibres. Effect aussi. effract est le métier à tisser entre les deux. Le corps d’un composant est un générateur interprété au sein de la passe de rendu de React — un seul flux de yield* parle les deux langages. C’est du React 100 % réel. Le réconciliateur n’est jamais remplacé.',
    rows: [
      { write: 'yield* Stats', does: 'résout un service depuis le runtime — de façon synchrone' },
      { write: 'yield* hook(useState(0))', does: 'un vrai hook React, dans un ordre stable' },
      { write: 'yield* fetchUser', does: 'suspend via React Suspense, reprend sur place' },
      { write: 'une erreur', does: 'remonte à l’error boundary la plus proche' },
    ],
  },
  everywhere: {
    label: 'Un composant, tous les runtimes',
    title: 'Serveur ou client : un simple <Runtime>',
    body: 'Fournissez un layer navigateur et c’est une SPA. Un layer serveur et c’est du SSR en flux. Branchez le moteur Flight et c’est un React Server Component. Le composant ne change pas — seul le runtime sous lui change.',
    runtimes: [
      { name: 'SPA', desc: 'Vite, dans le navigateur' },
      { name: 'SSR', desc: 'Bun / Node en flux' },
      { name: 'Web Worker', desc: 'hors du thread principal' },
      { name: 'RSC', desc: 'Flight, en flux' },
    ],
    caption: 'Les mêmes RECs s’affichent dans les quatre — démontré par les apps d’exemple.',
  },
  features: {
    label: 'Pourquoi effract',
    title: 'Le call site, avant tout',
    items: [
      {
        title: 'Du vrai React, de bout en bout',
        desc: 'Les hooks gardent leur ordre. Suspense, error boundaries, mémoïsation, hydratation et RSC fonctionnent — parce qu’effract rend à travers React, pas à côté.',
      },
      {
        title: 'Les services, en synchrone',
        desc: 'Lire un service est une lecture de Context, pas un aller-retour async. Aucun piège Effect.runSync n’atteint votre call site.',
      },
      {
        title: 'Des signaux sans cérémonie',
        desc: 'observe($ => $(count) * 2) re-rend précisément quand — et seulement quand — un atom lu change. Sans provider, sans boilerplate.',
      },
      {
        title: 'RSC, nativement',
        desc: 'Le même corps pilote un Server Component async et émet du Flight standard, depuis un serveur ou un Web Worker.',
      },
      {
        title: 'Des layers, composés',
        desc: 'Les services dépendent de services. Composez votre runtime avec les Layers d’Effect et confiez-le à un <Runtime>.',
      },
      {
        title: 'Typé de bout en bout',
        desc: 'Besoins et erreurs sont inférés depuis vos yield. Strict par design : tsgo, oxlint, dependency-cruiser, frontières hexagonales.',
      },
    ],
  },
  cta: {
    title: 'Écrivez-le une fois. Exécutez-le partout où tourne un runtime.',
    body: 'effract est sous licence MIT et publié sur npm. Commencez par la doc, ou lisez les huit recettes de call site.',
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
