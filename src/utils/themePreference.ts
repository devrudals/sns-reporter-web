/**
 * 테마(자동/다크/라이트) 저장 위치는 두 곳이다.
 *
 *  - localStorage: 화면이 그려지기 전에 읽어야 깜빡임이 없어서, 기기마다 남긴다.
 *  - 계정(Supabase auth user_metadata): 다른 기기로 로그인해도 따라오게 하려고
 *    함께 저장한다. 프로필의 이름·소속이 이미 같은 자리를 쓰고 있어 테이블을
 *    새로 만들거나 컬럼을 추가하지 않아도 된다.
 *
 * 두 값이 어긋나면 계정 쪽을 정답으로 본다 — 사용자가 "이 계정은 다크"라고
 * 정해 둔 것이므로, 처음 보는 기기라도 그 설정으로 시작해야 한다.
 */
export type Theme = 'system' | 'light' | 'dark';

export const THEME_KEYS = ['theme-preference', 'mobile-theme-preference'] as const;

/** 계정 설정이 바뀌어 화면에 반영됐을 때 토글 버튼이 라벨을 고칠 수 있도록 알린다. */
export const THEME_CHANGE_EVENT = 'yon:theme-change';

export const isTheme = (value: unknown): value is Theme =>
  value === 'system' || value === 'light' || value === 'dark';

export const readLocalTheme = (): Theme => {
  try {
    for (const key of THEME_KEYS) {
      const v = localStorage.getItem(key);
      if (isTheme(v)) return v;
    }
  } catch {}
  return 'system';
};

export const writeLocalTheme = (theme: Theme): void => {
  try {
    for (const key of THEME_KEYS) localStorage.setItem(key, theme);
  } catch {}
};

export const applyTheme = (theme: Theme): void => {
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.classList.toggle('dark', dark);
};

/**
 * 계정에 저장. 로그인하지 않았거나 통신이 실패해도 화면 동작을 막지 않는다 —
 * 기기에 남은 localStorage 값만으로도 이 기기에서는 정상 동작한다.
 */
export const saveThemeToAccount = async (
  supabase: { auth: { updateUser: (args: any) => Promise<any> } },
  theme: Theme
): Promise<void> => {
  try {
    await supabase.auth.updateUser({ data: { theme_preference: theme } });
  } catch {}
};
