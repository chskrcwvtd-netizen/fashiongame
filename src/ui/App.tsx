import { useEffect, useRef, useState } from 'react';
import type { Speed } from '../engine';
import { useStore } from './hooks';
import { MainMenu } from './screens/MainMenu';
import { TopBar } from './game/TopBar';
import { NavRail } from './game/NavRail';
import { Feed, Toasts } from './game/Feed';
import { HQPanel } from './game/HQPanel';
import { DesignLab } from './game/DesignLab';
import { ProductionPanel } from './game/ProductionPanel';
import { ShopPanel } from './game/ShopPanel';
import { DropsPanel } from './game/DropsPanel';
import { DropSplash, GameMenu, GameOver } from './game/Overlays';

function GameScreen() {
  const store = useStore();
  const [menu, setMenu] = useState(false);
  const resumeSpeed = useRef<Speed>(1);

  const openMenu = () => {
    resumeSpeed.current = store.speed;
    store.setSpeed(0);
    setMenu(true);
  };
  const closeMenu = () => {
    setMenu(false);
    if (store.phase === 'game') store.setSpeed(resumeSpeed.current || 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        if (store.splash) store.dismissSplash();
        else if (menu) closeMenu();
        else openMenu();
        return;
      }
      if (menu) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (store.speed === 0) store.setSpeed(resumeSpeed.current || 1);
        else {
          resumeSpeed.current = store.speed;
          store.setSpeed(0);
        }
      }
      if (e.key === '1') store.setSpeed(1);
      if (e.key === '2') store.setSpeed(2);
      if (e.key === '3') store.setSpeed(4);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`game ${store.speed === 0 ? 'is-paused' : ''}`} data-testid="game">
      <TopBar onMenu={openMenu} />
      <NavRail />
      <main className="stage">
        {store.panel === 'hq' && <HQPanel />}
        {store.panel === 'lab' && <DesignLab />}
        {store.panel === 'production' && <ProductionPanel />}
        {store.panel === 'shop' && <ShopPanel />}
        {store.panel === 'drops' && <DropsPanel />}
      </main>
      <Feed />
      <Toasts />
      <DropSplash />
      <GameOver />
      {menu && <GameMenu onClose={closeMenu} />}
    </div>
  );
}

export function App() {
  const store = useStore();
  useEffect(() => {
    store.startClock();
    const onUnload = () => store.saveSync('auto');
    window.addEventListener('beforeunload', onUnload);
    return () => {
      store.stopClock();
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [store]);
  return store.phase === 'game' && store.state ? <GameScreen /> : <MainMenu />;
}
