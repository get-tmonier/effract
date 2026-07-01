import { createRoot } from 'react-dom/client';
import { mount } from '@tmonier/effract';
import { Cart, App } from './App';

// `mount` is the one boundary — it supplies the runtime and verifies, at compile
// time, that `Cart.layer` provides every service the tree needs. Import it from
// `@tmonier/effract` in every file; where the module runs decides where it renders.
createRoot(document.getElementById('root')!).render(mount(Cart.layer, App));
