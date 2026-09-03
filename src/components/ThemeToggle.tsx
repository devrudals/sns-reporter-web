'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  type Theme,
  THEME_CHANGE_EVENT,
  applyTheme,
  readLocalTheme,
  saveThemeToAccount,
  writeLocalTheme,
} from '@/utils/themePreference';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = readLocalTheme();
    setTheme(savedTheme);
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (readLocalTheme() === 'system') applyTheme('system');
    };

    // 계정에 저장된 설정이 뒤늦게 도착해 화면이 바뀌면(다른 기기에서 로그인한
    // 경우) 버튼 라벨도 함께 따라와야 한다.
    const handleAccountSync = () => setTheme(readLocalTheme());

    mediaQuery.addEventListener('change', handleChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleAccountSync);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleAccountSync);
    };
  }, []);

  const cycleTheme = () => {
    const nextTheme: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    setTheme(nextTheme);
    writeLocalTheme(nextTheme);
    applyTheme(nextTheme);
    // 계정에도 남겨 다른 기기에서 로그인해도 같은 테마로 열리게 한다.
    void saveThemeToAccount(createClient(), nextTheme);
  };

  if (!mounted) {
    return (
      <div style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
    );
  }

  const getIconAndLabel = () => {
    switch (theme) {
      case 'dark':
        return { icon: '🌙', label: '다크 모드' };
      case 'light':
        return { icon: '☀️', label: '라이트 모드' };
      case 'system':
      default:
        return { icon: '💻', label: '시스템 설정 동기화' };
    }
  };

  const { icon, label } = getIconAndLabel();

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="motion-btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.45rem 0.75rem',
        borderRadius: '12px',
        backgroundColor: 'var(--input-glass-bg)',
        border: '1px solid var(--color-border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: 'var(--color-text-main)',
        fontSize: '0.8rem',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      title={`현재 테마: ${label} (클릭하여 시스템/다크/라이트 전환)`}
    >
      <span style={{ fontSize: '0.95rem' }}>{icon}</span>
      <span className="hidden sm:inline" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        {theme === 'system' ? '자동' : theme === 'dark' ? '다크' : '라이트'}
      </span>
    </button>
  );
}
