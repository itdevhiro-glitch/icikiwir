(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ENTER_DELAY = 18;
  const EXIT_DELAY = 340;

  function boot() {
    document.documentElement.classList.add('page-transition-ready');
    window.setTimeout(() => {
      document.documentElement.classList.add('page-transition-in');
    }, ENTER_DELAY);
  }

  function isInternalNavigation(link) {
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return false;
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin && url.href !== window.location.href;
  }

  window.smoothNavigate = function smoothNavigate(url) {
    if (!url) return;
    if (prefersReducedMotion) {
      window.location.href = url;
      return;
    }
    document.documentElement.classList.remove('page-transition-in');
    document.documentElement.classList.add('page-transition-out');
    window.setTimeout(() => { window.location.href = url; }, EXIT_DELAY);
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!isInternalNavigation(link)) return;
    event.preventDefault();
    window.smoothNavigate(link.href);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
