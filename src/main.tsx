import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/unbounded/400.css';
import '@fontsource/unbounded/700.css';
import '@fontsource/unbounded/800.css';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/unifrakturmaguntia/400.css';
import '@fontsource/rubik-bubbles/400.css';
import '@fontsource/permanent-marker/400.css';
import './styles/app.css';
import { App } from './ui/App';
import { StoreContext } from './ui/hooks';
import { GameStore } from './store/gameStore';
import { sfx } from './audio/sfx';
import { loadSettings } from './ui/screens/Settings';

loadSettings();
const store = new GameStore(undefined, sfx);
// exposed for automated play-testing only
(window as unknown as { __store: GameStore }).__store = store;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>
  </StrictMode>,
);
