/**
 * 해시태그 입력 동작을 PC 폼들이 공유하기 위한 헬퍼.
 *
 * 예전 PC 입력창은 확정된 태그와 지금 치고 있는 글자를 한 문자열에 같이 담았다.
 * 그래서 입력할 때마다 전체를 공백·쉼표로 쪼갰다 다시 합치게 되는데, 한글 IME가
 * 음절을 조합하는 도중에 이 일이 벌어지면 조합이 깨져 자모가 분리된 채로
 * 태그가 됐다("작성" → "ㅈ작성"). 모바일은 이미 확정된 태그(keywords)와 입력
 * 중인 글자(keywordInput)를 나눠 두어 이 문제가 없다 — PC도 같게 맞춘다.
 */

/** 라벨에 적힌 대로 태그는 최대 5개까지만 받는다. */
export const MAX_HASHTAGS = 5;

/** 확정 문자열("a, b")을 배열로. */
export const splitHashtags = (confirmed: string): string[] =>
  confirmed ? confirmed.split(',').map(s => s.trim()).filter(Boolean) : [];

/** 태그 하나를 확정 목록에 더한다. 중복·빈 값·정원 초과는 무시한다. */
export const commitHashtag = (confirmed: string, tag: string): string => {
  const t = tag.trim();
  if (!t) return confirmed;
  const existing = splitHashtags(confirmed);
  if (existing.includes(t) || existing.length >= MAX_HASHTAGS) return confirmed;
  return [...existing, t].join(', ');
};

/** 마지막 태그를 지운다 — 입력창이 빈 상태에서 백스페이스를 눌렀을 때. */
export const dropLastHashtag = (confirmed: string): string => {
  const existing = splitHashtags(confirmed);
  existing.pop();
  return existing.join(', ');
};

/** 특정 태그를 지운다 — 칩의 ✕ 버튼. */
export const removeHashtag = (confirmed: string, tag: string): string =>
  splitHashtags(confirmed).filter(t => t !== tag).join(', ');
