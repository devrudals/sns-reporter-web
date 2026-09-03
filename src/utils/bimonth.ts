/**
 * '분기' — 이 서비스에서는 3개월이 아니라 홀수월에서 시작하는 2개월 구간을
 * 뜻한다(1,2월 / 3,4월 / …). 모바일 전체 리스트가 먼저 이 단위를 썼고, PC
 * 전체 콘텐츠도 같은 기준으로 묶어 달라는 요청에 따라 정의를 여기로 모았다.
 * 두 화면이 각자 상수를 들고 있으면 한쪽만 바뀌어도 눈치채기 어렵다.
 */
export const BIMONTH_RANGES = [
  { label: '1, 2월', start: 1 },
  { label: '3, 4월', start: 3 },
  { label: '5, 6월', start: 5 },
  { label: '7, 8월', start: 7 },
  { label: '9, 10월', start: 9 },
  { label: '11, 12월', start: 11 },
];

/** 주어진 월(1~12)이 속한 구간의 시작월. 시작월은 언제나 홀수다. */
export const toBimonthStart = (month: number): number =>
  month % 2 === 1 ? month : month - 1;

/** 오늘이 속한 구간의 시작월. */
export const getCurrentBimonthStart = (): number =>
  toBimonthStart(new Date().getMonth() + 1);

export const getCurrentYear = (): number => new Date().getFullYear();

/** 시작월이 홀수이므로 두 번째 달은 언제나 같은 해 안에 있다. */
export const bimonthLabel = (start: number): string => `${start}, ${start + 1}월`;

/** 인접 구간으로 이동 — 연말·연초 경계를 넘는다. */
export const shiftBimonth = (
  year: number,
  start: number,
  direction: 1 | -1
): { year: number; start: number } => {
  let s = start + direction * 2;
  let y = year;
  if (s > 11) { s = 1; y += 1; }
  if (s < 1) { s = 11; y -= 1; }
  return { year: y, start: s };
};
