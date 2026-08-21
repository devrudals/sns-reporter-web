'use client';

import React, { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

// PC의 ThemeToggle과 별개로, 모바일 뷰에서만 쓰는 다크모드 설정이다 — PC의
// data-theme 속성을 그대로 재사용하면 PC에서 다크모드를 켠 채 모바일로 넘어올 때
// (같은 <html>을 공유하는 구조라) 그 값이 그대로 새어 들어가므로, 별도의
// data-mobile-theme 속성 + localStorage 키(mobile-theme-preference)로 분리했다.
export default function MobileThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem('theme-preference') || localStorage.getItem('mobile-theme-preference') || 'system') as Theme;
    setTheme(saved);
  }, []);

  const applyTheme = (next: Theme) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (next === 'dark') {
      root.setAttribute('data-mobile-theme', 'dark');
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else if (next === 'light') {
      root.setAttribute('data-mobile-theme', 'light');
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
    } else {
      root.removeAttribute('data-mobile-theme');
      if (prefersDark) {
        root.setAttribute('data-theme', 'dark');
        root.classList.add('dark');
      } else {
        root.setAttribute('data-theme', 'light');
        root.classList.remove('dark');
      }
    }
  };

  const cycleTheme = () => {
    const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    setTheme(next);
    localStorage.setItem('theme-preference', next);
    localStorage.setItem('mobile-theme-preference', next);
    applyTheme(next);
  };

  if (!mounted) return null;

  const { icon, label } = theme === 'dark'
    ? { icon: '🌙', label: '다크 모드' }
    : theme === 'light'
    ? { icon: '☀️', label: '라이트 모드' }
    : { icon: '💻', label: '시스템 설정 동기화' };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover-fine:bg-slate-100 text-sm font-bold text-slate-700 transition-colors border border-slate-200/80"
      title={`현재 테마: ${label} (탭하여 시스템/다크/라이트 전환)`}
    >
      <div className="flex items-center gap-3">
        <span className="text-base">{icon}</span>
        <span>화면 테마 · {theme === 'system' ? '자동' : theme === 'dark' ? '다크' : '라이트'}</span>
      </div>
      <span className="text-slate-400 font-bold">›</span>
    </button>
  );
}
