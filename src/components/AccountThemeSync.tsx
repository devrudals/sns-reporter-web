'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  THEME_CHANGE_EVENT,
  applyTheme,
  isTheme,
  readLocalTheme,
  saveThemeToAccount,
  writeLocalTheme,
} from '@/utils/themePreference';

/**
 * 로그인한 계정에 저장된 테마를 이 기기에 맞춰 주는 부품. 화면에는 아무것도
 * 그리지 않는다.
 *
 * 화면이 처음 그려질 때는 이 기기의 localStorage 값으로 칠해진다(깜빡임 방지).
 * 그 뒤 계정 설정을 확인해서,
 *
 *   - 계정에 값이 있고 이 기기와 다르면 → 계정 값으로 바꾼다.
 *     처음 쓰는 기기에서 한 번 잠깐 바뀌는 것이 보일 수 있는데, 그 뒤로는
 *     이 기기에도 같은 값이 남아 다시 나타나지 않는다.
 *   - 계정에 값이 아직 없으면 → 지금 이 기기의 설정을 계정에 올려 둔다.
 *     예전부터 쓰던 사람이 다시 고르지 않아도 되도록 하는 처리다.
 *
 * 테스트 모드처럼 실제 로그인 세션이 없는 경우에는 아무 일도 하지 않는다.
 */
export default function AccountThemeSync() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled || !user) return;

        const accountTheme = user.user_metadata?.theme_preference;
        const localTheme = readLocalTheme();

        if (isTheme(accountTheme)) {
          if (accountTheme !== localTheme) {
            writeLocalTheme(accountTheme);
            applyTheme(accountTheme);
            // 모바일 뷰는 data-mobile-theme을 따로 본다. 그 속성이 이미 붙어
            // 있다면(=모바일 화면) 여기서도 함께 맞춰 둔다. 모바일 토글이
            // 아래 이벤트를 받아 다시 맞추지만, 토글이 없는 화면도 있어서다.
            const root = document.documentElement;
            if (root.hasAttribute('data-mobile-theme')) {
              root.setAttribute('data-mobile-theme', root.getAttribute('data-theme') || 'light');
            }
            window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
          }
          return;
        }

        await saveThemeToAccount(supabase, localTheme);
      } catch {
        // 통신이 안 되면 이 기기에 남은 설정을 그대로 쓴다.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}
