# 디자인 점검 리포트 (2026-08-21)

## 점검 기준
- Emil Kowalski 디자인 엔지니어링 원칙 (`emil-design-eng` 스킬)
- Apple Fluid Interfaces 원칙 (`apple-design` 스킬)
- 프로젝트 표준: 모바일 글래스/블러 UI는 최소~무틴트 지향 (`glass-design-minimal-tint` 메모리)

## 한 줄 요약
전반적으로 모바일 UI는 스프링 이징·눌림 피드백·스태거링 등 상당히 공들인 모션 시스템을 갖췄지만, 몇 군데 핵심 화면(알림 팝오버, 캘린더 날짜 팝업)에서 글래스 틴트가 너무 진하거나 애니메이션이 아예 없는 등 나머지 완성도와 눈에 띄게 어긋나는 지점이 있고, `transition-all` 남용과 hover 가드 누락 같은 반복 패턴이 코드 전반에 퍼져 있음.

## 우선순위별 개선안

| 순위 | 파일:라인 | 문제 | 근거 | 제안 수정 | 상태 |
|---|---|---|---|---|---|
| 1 | `src/components/NotificationsPopup.tsx:76-116` | 알림 팝오버가 등장/퇴장 애니메이션 전혀 없이 즉시 나타남·사라짐. `transform-origin`도 없어 벨 아이콘과 무관한 위치에서 "뚝" 나타남 | Apple: 팝오버는 트리거 기준 anchored 등장 / Emil: 팝오버 125-250ms 필요 | `transform-origin: top right` + scale(0.95)→1, opacity 0→1, ~150ms ease-out transition 추가 | 미착수 |
| 2 | `src/components/mobile/MobileCalendar.tsx:815` | 캘린더 날짜 팝업 배경이 `bg-white/75 backdrop-blur-xs`로 강한 흰색 틴트 + 블러 중첩 | 프로젝트 표준: 모바일 글래스는 최소~무틴트여야 함 | `bg-white/75` → `bg-white/20~30` 수준으로 낮추거나 블러만으로 층 분리 | 미착수 |
| 3 | `src/app/globals.css:378` (`table tbody tr`) | `transition: all 0.2s ... !important`가 테이블 행 전체에 걸림 | Emil: `transition: all` 금지, 명시적 속성 지정 | `transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s` 로 명시 | 미착수 |
| 4 | `src/components/mobile/MobileTrioModal.tsx:758` | 시트 닫힘 애니메이션에 `ease-in` 사용 | Emil: UI에 `ease-in` 금지 | `ease-in` → `ease-out` 또는 커스텀 cubic-bezier로 교체 | 미착수 |
| 5 | `src/components/mobile/MobileTrioModal.tsx:571` | 댓글 하이라이트 배경 전환이 `duration-1000` | Emil: UI 애니메이션은 300ms 이하 권장 | 250~400ms로 단축 (하이라이트 유지시간은 별도 setTimeout으로 관리) | 미착수 |
| 6 | `src/components/mobile/*.tsx` 전반 (`hover:` 27건) | `@media (hover:hover)` 가드 없이 `hover:` 클래스 다수 사용 | Emil: hover는 `hover:hover and pointer:fine` 게이트 필수 | Tailwind v4 `@custom-variant`로 `hover-fine` 정의 후 일괄 치환 | 미착수 |
| 7 | `src/components/mobile/MobileDashboard.tsx:267` | 승인대기 카드 `transition-all cursor-pointer` | Emil: `transition-all` 금지 | `transition-colors, transition-transform` 등으로 분리 지정 | 미착수 |
| 8 | `src/components/ContentDetailModal.tsx:425,436,730,760,791,934,953` | 모달 내부 버튼 다수가 `transition-all` (7건) | Emil: `transition-all` 금지 | 실제 변경 속성만 명시 | 미착수 |
| 9 | `src/components/AdminBoardClient.tsx` (11곳) | 칸반보드 카드/필터 버튼 대부분이 `transition-all` | Emil: `transition-all` 금지 | 공통 유틸 클래스로 통일 | 미착수 |
| 10 | `src/app/globals.css:199,206-227` (`.sidebar-link`) | hover 시 scale+translateX 동시 발생, hover 가드 없음 | Apple/Emil: hover는 pointer:fine 가드 필요 | `@media (hover:hover) and (pointer:fine)`로 감싸기 | 미착수 |
| 11 | `src/components/mobile/MobileTrioModal.tsx:142,171` | 좋아요/복사 버튼 `transition-all duration-200` | Emil: `transition-all` 금지 | 속성별 개별 전환 명시 | 미착수 |
| 12 | `src/app/globals.css:1362-1449` (`.glass-cta` 8종) | 글래스 버튼 배경 알파값 0.16~0.85로 컴포넌트별 제각각 | 프로젝트 표준: 최소 틴트 지향 | CSS 커스텀 프로퍼티로 토큰화, 기본값 하향 재검토 | 미착수 |
| 13 | `src/components/mobile/MobileDashboard.tsx` 전역 | 타이포 토큰(`.typo-*`) 대신 임의 픽셀값(`text-[0.6rem]` 등) 다수 사용 | 디자인 토큰 일관성 원칙 | 모바일 전용 타이포 토큰(`.typo-mobile-*`) 정의 | 미착수 |
| 14 | `src/components/mobile/MobileDashboard.tsx:311-322` | CTA 버튼 그룹과 하단 nav의 duration이 매직넘버로만 동기화 | Apple: 연관 요소 간 대칭적 모션 | 공통 duration을 CSS 변수로 추출 | 미착수 |
| 15 | `src/components/mobile/MobileTrioModal.tsx:744` | 딤 배경은 keyframe 기반, 다른 상태는 CSS transition — 메커니즘 혼재 | Emil: 자주 트리거되는 UI는 인터럽트 가능한 transition 권장 | keyframe → opacity transition으로 통일 | 미착수 |

## 패턴 수준 이슈
- **`transition-all` 남용**: `src/` 전역 총 48건 (`ContentDetailModal.tsx` 7건, `AdminBoardClient.tsx` 11건, `MobileTrioModal.tsx` 4건 집중)
- **`ease-in` 사용**: 실질적으로 1건 (`MobileTrioModal.tsx:758`, exit 애니메이션이라 놓치기 쉬움)
- **`scale(0)` 진입 애니메이션**: 0건 (양호)
- **300ms 초과 duration**: `duration-1000` 1건 외 대부분 200~300ms 이내로 양호
- **hover 가드 누락**: `@media (hover` 가드 프로젝트 전체 0건, 모바일 전용 컴포넌트 7개 파일에 `hover:` 27건 무가드
- **`prefers-reduced-motion` 대응**: 전체 2건만 검색됨, 우선순위는 낮음
- **다크모드 색상 오버라이드**: `globals.css`가 인라인 hex 값을 문자열 셀렉터로 500줄 넘게 하드코딩 — 토큰 미사용의 근본 원인
- **글래스 재질 알파값 스펙트럼**: `.glass-cta*` 0.05(navbar)~0.85(sky)로 넓게 분포, "최소 틴트" 원칙이 일부 컴포넌트에서 미준수

## 점검 범위 밖 (참고)
- Impeccable, Jakub Krehel(Better) Claude Code 플러그인은 2026-08-21 세션 중 설치되었으나 재시작 전이라 이번 점검에는 미반영. 재시작 후 2차 점검에서 접근성/타이포/컬러 룰 관점 추가 예정.
