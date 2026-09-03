/**
 * 콘텐츠가 "언제 나가는가"를 판정하는 단 하나의 기준.
 *
 * 예전에는 PC 대시보드 캘린더가 귀속 월(targetMonth)로, 모바일 캘린더가
 * 희망일(target_date/desiredDate)로 각각 걸러서 같은 2026년 9월을 두고
 * PC는 2건, 모바일은 7건을 보여줬다. 심지어 PC 캘린더는 월 목록은
 * targetMonth로 좁히면서 날짜 클릭 매칭은 희망일로 해, 9월 3일에 예정된
 * 콘텐츠가 있어도 그 날짜를 눌렀을 때 아무것도 뜨지 않았다.
 *
 * 이제 두 화면 모두 이 파일의 함수만 쓴다. 기준은 희망일이다.
 */

import type { CSSProperties } from 'react';

/** 리스트 정렬과 캘린더 표시에 쓰는 중요도. */
export type Timeliness = '상시' | '보통' | '중요';

export interface ContentSchedule {
  /** 'YYYY-MM-DD'. 상시면 빈 문자열. */
  start: string;
  /** 'YYYY-MM-DD'. 하루짜리면 start와 같다. 상시면 빈 문자열. */
  end: string;
  timeliness: Timeliness;
  /** 희망일이 없어 특정 날짜에 놓을 수 없는 콘텐츠(= 기존 '상관없음'). */
  isAlways: boolean;
  /** 기간이 이틀 이상인지 — 캘린더에서 여러 날에 걸친 막대로 그린다. */
  isMultiDay: boolean;
}

export const parseContentBody = (item: any): any => {
  try {
    return JSON.parse(item?.content_body || '{}');
  } catch {
    return {};
  }
};

const toDay = (v: unknown): string => (typeof v === 'string' ? v.trim().split('T')[0] : '');

/**
 * 콘텐츠 하나의 일정을 뽑는다. content_body를 이미 파싱해 뒀다면 넘겨서
 * 중복 파싱을 피할 수 있다.
 */
export const getContentSchedule = (item: any, parsedBody?: any): ContentSchedule => {
  const body = parsedBody ?? parseContentBody(item);

  const start = toDay(item?.target_date) || toDay(body.desiredDate) || toDay(body.targetDate);
  // 희망일이 없으면 캘린더에 놓을 자리가 없다 — 실제 데이터에서도
  // '상관없음'과 "날짜 없음"은 정확히 일치한다.
  if (!start) {
    return { start: '', end: '', timeliness: '상시', isAlways: true, isMultiDay: false };
  }

  const rawEnd = toDay(body.desiredDateEnd) || toDay(body.targetDateEnd);
  const end = rawEnd && rawEnd >= start ? rawEnd : start;

  const raw = String(body.timeliness || '');
  const timeliness: Timeliness =
    raw === '중요' ? '중요'
    : raw === '보통' ? '보통'
    // timeliness 필드가 없던 옛 기록은 기간 길이로 추정한다.
    : end !== start ? '보통'
    : '중요';

  return { start, end, timeliness, isAlways: false, isMultiDay: end !== start };
};

/** 'YYYY-MM' 접두. month는 0-based(자바스크립트 Date 관례). */
export const monthPrefixOf = (year: number, month0: number): string =>
  `${year}-${String(month0 + 1).padStart(2, '0')}`;

/** 일정이 해당 월과 하루라도 겹치는가. 기간 콘텐츠는 걸쳐 있기만 해도 포함된다. */
export const overlapsMonth = (s: ContentSchedule, year: number, month0: number): boolean => {
  if (s.isAlways) return false;
  const prefix = monthPrefixOf(year, month0);
  // ISO 문자열이라 사전순 비교가 곧 날짜 비교다. '-31'은 그 달의 어떤 날보다 크거나 같다.
  return s.start <= `${prefix}-31` && s.end >= `${prefix}-01`;
};

/** 일정이 특정 날짜('YYYY-MM-DD')에 걸치는가. 기간이면 그 사이 모든 날에 참. */
export const occursOn = (s: ContentSchedule, dateStr: string): boolean => {
  if (s.isAlways || !dateStr) return false;
  const day = dateStr.split('T')[0];
  return s.start <= day && day <= s.end;
};

/**
 * 리스트 정렬 비교자 — 희망일 빠른 순. 중요도는 정렬에 쓰지 않는다(요청 반영):
 * 특정 날짜가 없는 '상시'는 리스트에서 별도 접이식 묶음으로 빠지므로, 남은
 * 항목들은 사용자가 달력에서 보는 것과 같은 날짜 순서로 늘어놓는 것이 맞다.
 * 같은 날짜끼리는 제목순으로 안정적인 순서를 만든다.
 */
export const compareBySchedule = (a: any, b: any): number => {
  const sa = getContentSchedule(a);
  const sb = getContentSchedule(b);
  // 혹시 상시가 섞여 들어온 리스트에서도 위쪽에 모이도록 한다.
  if (sa.isAlways !== sb.isAlways) return sa.isAlways ? -1 : 1;
  if (!sa.isAlways && sa.start !== sb.start) return sa.start < sb.start ? -1 : 1;
  return String(a?.title || '').localeCompare(String(b?.title || ''), 'ko');
};

/**
 * 캘린더 막대의 플랫폼별 색 — 팀(플랫폼) 기준이다. 예전 PC 캘린더는 중요도만으로
 * 색을 나눴는데, 모바일과 달라 같은 콘텐츠가 화면마다 다른 색으로 보였다.
 * 유튜브=레드, 인스타=옐로우, 네이버블로그=그린(요청 반영).
 */
export const getPlatformBarColor = (team: unknown): string => {
  if (team === '유튜브') return '#DC2626';
  if (team === '인스타') return '#FFB800';
  // 네이버블로그 그린은 원래 #16A34A였는데, 막대에 제목을 넣고 나니 흰 글자와의
  // 대비가 3.58:1로 WCAG AA(4.5:1)에 미달했다(axe-core 제보). 초록으로 읽히는
  // 범위에서 한 단계만 진하게 내려 5.0:1을 확보한다.
  if (team === '블로그') return '#15803D';
  return '#64748B';
};

/**
 * 막대 하나의 배경색과 글자색.
 *
 * 테두리(inset box-shadow)는 뺐다(요청 반영) — 중요도는 "진하기"로만 구분한다.
 * 하루짜리('중요')는 플랫폼 색을 꽉 채우고, 기간('보통')은 같은 색의 옅은 띠다.
 * 테두리가 없어진 만큼 옅은 띠가 배경에 묻히지 않도록 26% → 32%로 올렸다.
 *
 * 막대 안에 제목을 다시 넣기로 해(요청 반영) 글자색도 여기서 함께 정한다.
 * 꽉 찬 막대는 배경이 고정색이라 명도로 흑/백을 갈라도 되지만, 옅은 띠는
 * 라이트/다크에 따라 깔리는 바탕이 정반대라 인라인 값으로는 한쪽이 반드시
 * 묻힌다 — globals.css의 --cal-bar-ink(테마별로 뒤집히는 먹색)와 섞어
 * "같은 계열의 진한(다크에선 밝은) 글자색"을 만든다.
 */
export const getBarStyle = (team: unknown, timeliness: Timeliness): CSSProperties => {
  const c = getPlatformBarColor(team);
  if (timeliness === '중요') {
    // 인스타 옐로(#FFB800)만 밝아서 흰 글자가 날아간다 — 여기만 검정.
    return { backgroundColor: c, color: team === '인스타' ? '#1F2937' : '#FFFFFF' };
  }
  return {
    backgroundColor: `color-mix(in srgb, ${c} 32%, transparent)`,
    color: `color-mix(in srgb, ${c} 55%, var(--cal-bar-ink, #0F172A))`,
  };
};

/**
 * 막대 안 제목을 넣을 수 있는 최소 높이(px). 레인이 많아 막대가 이보다 얇아지면
 * 글자가 잘려 오히려 지저분해지므로 색 띠만 남긴다(요청 반영). 9px 글자를
 * line-height 1로 넣어 실제로 렌더해 본 결과 12px 아래에서는 획이 뭉갠다.
 */
export const BAR_TITLE_MIN_HEIGHT_PX = 12;
