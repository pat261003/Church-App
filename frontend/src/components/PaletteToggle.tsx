import { useEffect, useState } from 'react';

export default function PaletteToggle() {
  const [isRoseTheme, setIsRoseTheme] = useState(() => {
    return localStorage.getItem('site-theme') === 'rose';
  });

  useEffect(() => {
    const theme = isRoseTheme ? 'rose' : 'default';

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('site-theme', theme);
  }, [isRoseTheme]);

  return (
    <button
      type="button"
      onClick={() => setIsRoseTheme(prev => !prev)}
      className="rounded-full border border-white/40 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15 transition-colors"
      title="Switch website color palette"
    >
      {isRoseTheme ? 'Original Colors' : 'Rose Palette'}
    </button>
  );
}