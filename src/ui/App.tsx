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
import { GameMenu, GameOver } from './game/Overlays';
import { CampaignSplash, Intro, LiveDrop } from './game/Moments';
import { RivalsPanel } from './game/RivalsPanel';
import { WholesalePanel } from './game/WholesalePanel';
import { StatsPanel } from './game/StatsPanel';
import { WorldPanel } from './game/WorldPanel';
import { EmpirePanel } from './game/EmpirePanel';
import { Lookbook } from './game/Lookbook';
import { HelpButton, HOTKEYS } from './game/Help';
import { music } from '../audio/music';
import { ambience } from '../audio/sfx';
import { TrendsPanel } from './game/TrendsPanel';
import { MarketingPanel } from './game/MarketingPanel';
import { TeamPanel } from './game/TeamPanel';
import { EventModal } from './game/EventModal';

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
        if (document.querySelector('[data-testid=logo-modal]')) return;
        if (store.splash) store.dismissSplash();
        else if (menu) closeMenu();
        else openMenu();
        return;
      }
      if (menu) return;
      if (e.key === ' ') {
        e.preventDefault();
        // A focused button would also be "pressed" by Space on key-up (e.g. a second order).
        if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') e.target.blur();
        if (store.speed === 0) store.setSpeed(resumeSpeed.current || 1);
        else {
          resumeSpeed.current = store.speed;
          store.setSpeed(0);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        store.undoLast();
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && HOTKEYS[e.key.toLowerCase()]) store.setPanel(HOTKEYS[e.key.toLowerCase()]);
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
      <main className="stage" key={store.panel}>
        {store.panel === 'hq' && <HQPanel />}
        {store.panel === 'lab' && <DesignLab />}
        {store.panel === 'production' && <ProductionPanel />}
        {store.panel === 'shop' && <ShopPanel />}
        {store.panel === 'drops' && <DropsPanel />}
        {store.panel === 'trends' && <TrendsPanel />}
        {store.panel === 'marketing' && <MarketingPanel />}
        {store.panel === 'team' && <TeamPanel />}
        {store.panel === 'rivals' && <RivalsPanel />}
        {store.panel === 'wholesale' && <WholesalePanel />}
        {store.panel === 'stats' && <StatsPanel />}
        {store.panel === 'world' && <WorldPanel />}
        {store.panel === 'empire' && <EmpirePanel />}
        {store.panel === 'lookbook' && <Lookbook />}
        <HelpButton panel={store.panel} />
      </main>
      <Feed />
      <Toasts />
      {store.undo && Date.now() < store.undo.until && (
        <button className="undo-btn" onClick={() => store.undoLast()} data-testid="undo">
          Undo: {store.undo.label}
        </button>
      )}
      <LiveDrop />
      <EventModal />
      <CampaignSplash />
      <GameOver />
      {menu && <GameMenu onClose={closeMenu} />}
    </div>
  );
}

export function App() {
  const store = useStore();
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    void music.init();
  }, []);
  useEffect(() => {
    if (intro) return;
    music.setScene(store.phase === 'game' ? 'game' : 'menu');
  }, [store.phase, intro]);
  const hype = store.state?.hype ?? 0;
  useEffect(() => music.setIntensity(store.phase === 'game' ? hype / 100 : 0), [hype, store.phase]);
  const onHq = store.phase === 'game' && store.panel === 'hq';
  useEffect(() => ambience.set(onHq), [onHq]);
  useEffect(() => {
    store.startClock();
    const onUnload = () => store.saveSync('auto');
    window.addEventListener('beforeunload', onUnload);
    window.streetwear?.onBeforeClose(onUnload);
    // Phones never say goodbye: iOS just freezes the page when you switch apps, so save then.
    const onHide = () => document.visibilityState === 'hidden' && onUnload();
    if (!window.streetwear) document.addEventListener('visibilitychange', onHide);
    return () => {
      store.stopClock();
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [store]);
  if (intro) return <Intro onDone={() => setIntro(false)} />;
  return store.phase === 'game' && store.state ? <GameScreen /> : <MainMenu />;
}
