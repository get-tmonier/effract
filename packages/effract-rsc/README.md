# @tmonier/effract-rsc

Drive [effract](https://github.com/get-tmonier/effract) React Effect Components with an Effect runtime and
stream them as React Server Components (Flight).

```tsx
import { serverComponent, renderToFlightStream } from '@tmonier/effract-rsc';

// the same service-only body a client `component` accepts
const Header = serverComponent(statsBadge);

const stream = renderToFlightStream(<Header />, { runtime }); // → text/x-component
```

- `serverComponent` / `serverView` — async React Server Components backed by an Effect runtime.
- `driveServerRec` (also at `@tmonier/effract-rsc/driver`) — drive a REC body against a runtime you own
  (e.g. inside a Next.js server component).
- `renderToFlightStream` — stream standard Flight behind an `AsyncLocalStorage` runtime scope.
- `@tmonier/effract-rsc/worker` — render Flight off the main thread in a Web Worker.

MIT © Tmonier
