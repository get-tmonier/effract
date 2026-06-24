/**
 * Server-component forms of the shared RECs, for the RSC example. They wrap the
 * *same* body functions used on the client — `statsBadge` here is byte-for-byte
 * the one `recs.tsx` renders as a client component.
 */
import { serverComponent } from '@tmonier/effract-rsc';
import { statsBadge } from './bodies.tsx';

/** The shared service-only badge, as an async React Server Component. */
export const StatsBadgeServer = serverComponent(statsBadge);
