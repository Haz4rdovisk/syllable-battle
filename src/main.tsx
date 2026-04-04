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

if ('serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // Keep the app boot resilient even if the SW bundle is unavailable.
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
