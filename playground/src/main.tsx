import { createRoot } from 'react-dom/client';
import { mount } from '@tmonier/effract';
import { AppLive, Counter } from './App';

// `mount` is the one boundary — it supplies the runtime and verifies, at compile
// time, that `AppLive` provides every service the tree needs. Import it from
// `@tmonier/effract` in every file; where the module runs decides where it renders.
createRoot(document.getElementById('root')!).render(mount(AppLive, Counter));
