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
      aria-label={isRoseTheme ? 'Switch to original colors' : 'Switch to rose color palette'}
      title={isRoseTheme ? 'Switch to original colors' : 'Switch to rose color palette'}
      className={`h-9 w-9 rounded-full border border-white/40 bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center ${
        isRoseTheme ? 'ring-2 ring-white shadow-md' : ''
      }`}
    >
      <span className="grid grid-cols-2 gap-0.5">
        <span className="h-2.5 w-2.5 rounded-full border border-white/40 bg-[#F8F3EA]" />
        <span className="h-2.5 w-2.5 rounded-full border border-white/40 bg-[#0B1957]" />
        <span className="h-2.5 w-2.5 rounded-full border border-white/40 bg-[#FFDBD1]" />
        <span className="h-2.5 w-2.5 rounded-full border border-white/40 bg-[#FA9EBC]" />
      </span>
    </button>
  );
}