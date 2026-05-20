// ── PWA Registration ───────────────────────────────────────

export const registerSW = async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return;
    }
  
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('Service worker registered:', reg.scope);
  
      // Listen for messages from service worker (e.g. flush queue)
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'FLUSH_QUEUE') {
          window.dispatchEvent(new CustomEvent('zammarket:flush-queue'));
        }
      });
  
      return reg;
    } catch (err) {
      console.error('SW registration failed:', err.message);
    }
  };
  
  // Request background sync when back online
  export const requestSync = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      if ('sync' in reg) {
        await reg.sync.register('zammarket-sync-messages');
      }
    } catch (err) {
      console.warn('Background sync not available:', err.message);
    }
  };
  
  // Check if app is installed as PWA
  export const isPWA = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;