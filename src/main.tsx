import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: 'landscape' | 'landscape-primary' | 'landscape-secondary') => Promise<void>;
};

const lockLandscapeOrientation = async () => {
  if (!('orientation' in screen)) {
    return;
  }

  const orientation = screen.orientation as ScreenOrientationWithLock;
  if (typeof orientation.lock !== 'function') {
    return;
  }

  try {
    await orientation.lock('landscape-primary');
  } catch {
    // Some browsers only allow screen lock in installed app contexts. Ignore gracefully.
  }
};

void lockLandscapeOrientation();
window.addEventListener('focus', () => {
  void lockLandscapeOrientation();
});
window.addEventListener('pageshow', () => {
  void lockLandscapeOrientation();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void lockLandscapeOrientation();
  }
});

window.__SPELLCAST_BUILD__ = __APP_BUILD__;
document.documentElement.setAttribute('data-app-build', __APP_BUILD__);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
