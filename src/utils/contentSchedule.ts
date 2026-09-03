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

/** 리스트 정렬과 캘린더 표시에 쓰는 중요도. 낮을수록 리스트 위쪽. */
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

/** 리스트 정렬 순서: 상시 → 보통 → 중요 (중요도 오름차순). */
export const TIMELINESS_ORDER: Record<Timeliness, number> = {
  상시: 0,
  보통: 1,
  중요: 2,
};

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
 * 리스트 정렬 비교자 — 상시 → 보통 → 중요, 같은 중요도 안에서는 빠른 날짜 순.
 * 상시끼리는 날짜가 없으므로 제목순으로 안정적인 순서를 만든다.
 */
export const compareBySchedule = (a: any, b: any): number => {
  const sa = getContentSchedule(a);
  const sb = getContentSchedule(b);
  const order = TIMELINESS_ORDER[sa.timeliness] - TIMELINESS_ORDER[sb.timeliness];
  if (order !== 0) return order;
  if (sa.isAlways && sb.isAlways) {
    return String(a?.title || '').localeCompare(String(b?.title || ''), 'ko');
  }
  if (sa.start !== sb.start) return sa.start < sb.start ? -1 : 1;
  return String(a?.title || '').localeCompare(String(b?.title || ''), 'ko');
};
