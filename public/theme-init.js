// Runs before the app bundle so the saved theme applies on first paint.
// Kept as an external file so the hosting policy can require scripts from this origin only.
(() => {
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  try {
    const saved = localStorage.getItem('placement-theme');
    if (saved === 'dark' || saved === 'light') theme = saved;
  } catch {}
  document.documentElement.dataset.theme = theme;
})();
