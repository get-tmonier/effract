export interface RuntimeCard {
  readonly name: string;
  readonly desc: string;
}

export interface Feature {
  readonly title: string;
  readonly desc: string;
}

export interface YieldRow {
  readonly write: string;
  readonly does: string;
}

export interface SiteContent {
  readonly meta: {
    readonly title: string;
    readonly description: string;
  };
  readonly nav: {
    readonly thesis: string;
    readonly everywhere: string;
    readonly features: string;
    readonly docs: string;
  };
  readonly hero: {
    readonly eyebrow: string;
    readonly titleLead: string;
    readonly titleGradient: string;
    readonly subtitle: string;
    readonly ctaPrimary: string;
    readonly ctaSecondary: string;
    readonly installNote: string;
  };
  readonly weave: {
    readonly react: string;
    readonly effect: string;
    readonly aria: string;
    readonly caption: string;
    readonly captionEnd: string;
  };
  readonly thesis: {
    readonly label: string;
    readonly title: string;
    readonly body: string;
    readonly rows: readonly YieldRow[];
  };
  readonly everywhere: {
    readonly label: string;
    readonly title: string;
    readonly body: string;
    readonly runtimes: readonly RuntimeCard[];
    readonly caption: string;
  };
  readonly philosophy: {
    readonly label: string;
    readonly title: string;
    readonly body: string;
    readonly points: readonly Feature[];
  };
  readonly features: {
    readonly label: string;
    readonly title: string;
    readonly items: readonly Feature[];
  };
  readonly cta: {
    readonly title: string;
    readonly body: string;
    readonly primary: string;
    readonly secondary: string;
  };
  readonly footer: {
    readonly tagline: string;
    readonly builtBy: string;
    readonly docs: string;
    readonly npm: string;
  };
}
