'use client';

/**
 * The client's `.catch` boundary.
 *
 * `.catch` maps a REC's typed failures to fallback UI. On the client it must be a
 * real React **error boundary**, not an inline catch: a body that fails part-way
 * has called *fewer* hooks than a successful render, and the moment that happens
 * on a re-render React tears the subtree down ("rendered fewer hooks than
 * expected"). A component that *throws* is discarded by React — partial hooks and
 * all — so the boundary can render the fallback safely no matter where the
 * failing `yield*` sat in the body. (The server driver has no hooks, so it
 * catches inline; this is the client's half only.)
 *
 * Recovery: while a fallback is shown, the boundary watches the atoms the body
 * read before it failed — which include a `query`'s key inputs — and resets when
 * any of them changes, re-mounting the REC so it re-runs (and succeeds once the
 * failing input is gone).
 */
import {
  Component,
  Fragment,
  createContext,
  createElement,
  useEffect,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { CatchDispatch, ReadableAtom } from '#domain/protocol.ts';

/**
 * The per-boundary set a REC records its read atoms into, so the boundary can
 * watch them for a reset. `null` when a REC renders outside any `.catch`.
 */
export const ReadSink = createContext<Set<ReadableAtom<unknown>> | null>(null);

const tagOf = (error: unknown): string | undefined =>
  typeof error === 'object' &&
  error !== null &&
  typeof (error as { readonly _tag?: unknown })._tag === 'string'
    ? (error as { readonly _tag: string })._tag
    : undefined;

interface BoundaryProps {
  readonly handlers: CatchDispatch<ReactNode>;
  readonly sink: Set<ReadableAtom<unknown>>;
  readonly children: ReactNode;
}

/**
 * Catches a thrown typed error and renders its `.catch` fallback. A suspension (a
 * thrown thenable) is not an error — React routes it to `<Suspense>`, never here.
 * A defect, or a tag this REC did not name, is re-thrown so the next boundary up
 * handles it; effract never silently swallows those.
 */
class Boundary extends Component<BoundaryProps, { error: unknown }> {
  override state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown): { error: unknown } {
    return { error };
  }

  private readonly reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const tag = tagOf(error);
    const handler = tag === undefined ? undefined : this.props.handlers[tag];
    if (handler === undefined) {
      throw error; // not this REC's to handle — re-propagate to the next boundary
    }
    return createElement(
      Fragment,
      null,
      createElement(ResetWatcher, { atoms: this.props.sink, onReset: this.reset }),
      handler(error),
    );
  }
}

/**
 * While the fallback is shown, subscribe to the atoms the failed body read and
 * reset the boundary when any changes — so the REC re-mounts and re-runs.
 */
const ResetWatcher = ({
  atoms,
  onReset,
}: {
  readonly atoms: Set<ReadableAtom<unknown>>;
  readonly onReset: () => void;
}): null => {
  useEffect(() => {
    const unsubscribes = Array.from(atoms, (atom) => atom.subscribe(onReset));
    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }, [atoms, onReset]);
  return null;
};

/**
 * Wrap a REC element in its `.catch` boundary: a fresh read-sink is provided to
 * the child (which records into it as it reads atoms) and handed to the boundary
 * (which watches it for a reset).
 */
export const withCatch = (
  handlers: CatchDispatch<ReactNode>,
  child: ReactElement,
): ReactElement => {
  const sink = new Set<ReadableAtom<unknown>>();
  return createElement(
    ReadSink.Provider,
    { value: sink },
    createElement(Boundary, { handlers, sink, children: child }),
  );
};
