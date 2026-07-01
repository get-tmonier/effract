import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// `App` is what `mount(AppLive, Page)` returns — an ordinary React node that
// carries the runtime. Render it like any other.
createRoot(document.getElementById('root')!).render(App);
