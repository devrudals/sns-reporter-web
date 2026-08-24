'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { DriveColorIcon, DriveLockedIcon } from './driveIcons';
import { YoutubeIcon, InstagramIcon, NaverBlogIcon, GenericPostIcon } from './platformIcons';
import { calculateDday } from '@/utils/dateUtils';

interface MobileKanbanProps {
  contents: any[];
  selectedItem: any;
  onSelectItem: (item: any) => void;
  user?: any;
  onOpenDetail: (item: any, type: 'proposal' | 'final') => void;
  onOpenSubmit: (mode: 'proposal' | 'final', targetItem?: any) => void;
  onOpenComments: (item: any) => void;
  // 롱프레스 드래그 중엔 하단 4탭 네비게이션이 스르륵 사라졌다가 손을 떼면
  // 다시 나타난다(요청 반영) — 그 네비게이션은 MobileShell이 소유하므로 이
  // 콜백으로 활성 여부만 알려주고, 실제 슬라이드 애니메이션은 MobileShell에서 처리한다.
  onDragActiveChange?: (active: boolean) => void;
}

// ────────── Stage Definition (PC AdminBoardClient의 KANBAN_COLUMNS와 동일한 5단계) ──────────

const STAGES = [
  { id: 'review_required', label: '검토 필요', short: '검토', icon: '📋', statuses: ['pending', 'final_submitted', 'review_required'], dropStatus: 'pending' },
  { id: 'revision_pending', label: '수정 대기', short: '수정', icon: '🔧', statuses: ['revision', 'final_revision'], dropStatus: 'revision' },
  { id: 'awaiting_final', label: '완성본 대기', short: '대기', icon: '⏳', statuses: ['approved'], dropStatus: 'approved' },
  { id: 'needs_upload', label: '업로드 필요', short: '업로드', icon: '📤', statuses: ['completed'], dropStatus: 'completed' },
  { id: 'completed', label: '완료', short: '완료', icon: '✅', statuses: ['uploaded'], dropStatus: 'uploaded' },
];

const LONG_PRESS_MS = 420;
const MOVE_CANCEL_PX = 10;
// 헤더가 최대로 커져도 하단 캡슐 네비게이션(높이 약 58px + 하단 여백 + safe-area)에
// 닿지 않도록 넉넉히 남겨두는 여유 — 요청 반영(120px로는 기기별 safe-area에 따라
// 여전히 닿아 보인다는 피드백으로 큰 폭으로 늘림). 최종 높이는 이 값을 뺀 것과
// <main> 높이의 60% 중 더 작은 쪽으로, 두 배로 안전하게 제한한다.
const BOTTOM_NAV_CLEARANCE_PX = 220;
const MAX_EXPANDED_RATIO = 0.6;

function triggerHaptic(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {}
}

// ────────── Helpers (PC AdminBoardClient 로직을 그대로 이식) ──────────

const formatCleanCrewName = (name: string) => {
  if (!name) return '';
  return name.replace(/\([^)]*\)/g, '').trim();
};

const getPlatformStyle = (team: string) => {
  if (team === '유튜브') return { icon: <YoutubeIcon className="w-3.5 h-3.5 flex-shrink-0" /> };
  if (team === '인스타') return { icon: <InstagramIcon className="w-3.5 h-3.5 flex-shrink-0" /> };
  if (team === '블로그') return { icon: <NaverBlogIcon className="w-3.5 h-3.5 flex-shrink-0" /> };
  return { icon: <GenericPostIcon className="w-3.5 h-3.5 flex-shrink-0" /> };
};

const getItemTriggerInfo = (item: any) => {
  let bodyObj: any = {};
  try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
  const discussions: any[] = bodyObj.discussions || [];
  const lastComment = discussions.length > 0 ? discussions[discussions.length - 1] : null;

  if (item.status === 'pending') {
    if (discussions.length > 0 && lastComment?.role === 'writer') return `단원 댓글: "${lastComment.text}"`;
    return '최초 제출된 기획안';
  }
  if (item.status === 'review_required') {
    if (lastComment?.role === 'writer') return `단원 댓글: "${lastComment.text}"`;
    return '단원이 내용 수정함 (재검토 필요)';
  }
  if (item.status === 'revision') {
    if (lastComment?.role === 'admin') return `피드백 전달됨: "${lastComment.text}"`;
    return '기획안 수정 대기 중';
  }
  if (item.status === 'approved') return '기획안 승인 완료 · 완성본 제작 중';
  if (item.status === 'final_submitted') return '완성본 제출됨 (최종 검토 필요)';
  if (item.status === 'final_revision') {
    if (lastComment?.role === 'admin') return `완성본 피드백: "${lastComment.text}"`;
    return '완성본 수정 대기 중';
  }
  if (item.status === 'completed') {
    const desiredDate = bodyObj.desiredDate;
    return desiredDate ? `희망 업로드일: ${desiredDate}` : '완성본 승인됨 (업로드 대기)';
  }
  if (item.status === 'uploaded') return '업로드 완료';
  return '상태 대기 중';
};

// 소속/유형 모두 '전체' 옵션을 포함한 단일 선택(라디오 방식) — 한 축당 버튼 하나만
// 선택 가능하다(요청 반영, 예전엔 다중 선택 토글이었다).
const TEAM_FILTERS = ['전체', '유튜브', '인스타', '블로그', '단장 팀'];
const TYPE_FILTERS = ['전체', '영상(롱폼)', '영상(숏폼)', '카드뉴스', '글 기사'];
// PC AdminBoardClient의 긴급도 필터(마감 임박/피드백 대기)를 그대로 이식.
const URGENCY_FILTERS: { value: 'all' | 'urgent_deadline' | 'unresolved_feedback'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'urgent_deadline', label: '마감 임박' },
  { value: 'unresolved_feedback', label: '피드백 대기' },
];

// 롱프레스 드래그 변경 기록 한 줄에 쓰는 상태 라벨 — MobileTrioModal의
// STATUS_OPTIONS와 동일한 표기를 쓴다.
const STATUS_LABELS: Record<string, string> = {
  pending: '기획안 대기',
  revision: '기획안 수정요청',
  rejected: '반려',
  approved: '기획안 통과',
  final_submitted: '완성본 제출됨',
  final_revision: '완성본 수정요청',
  completed: '업로드 대기',
  uploaded: '업로드 완료',
};

const formatChangeTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
};

export default function MobileKanban({ contents, selectedItem, onSelectItem, user, onOpenDetail, onOpenSubmit, onOpenComments, onDragActiveChange }: MobileKanbanProps) {
  const supabase = createClient();
  const router = useRouter();

  // 드래그로 상태를 바꾸면 서버 재검증 전까지 화면에 즉시 반영해야 하므로(PC
  // AdminBoardClient와 동일한 이유) props를 그대로 쓰지 않고 로컬 사본을 둔다.
  const [contentsList, setContentsList] = useState<any[]>(contents);
  useEffect(() => { setContentsList(contents); }, [contents]);

  const [activeStage, setActiveStage] = useState<string>(STAGES[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('전체');
  const [selectedType, setSelectedType] = useState<string>('전체');
  // 긴급도 기본값 — '피드백 대기' 기본 선택도 요청되었다가 취소되어, 필터 패널과
  // 마찬가지로 아무 것도 선택되지 않은 '전체' 상태로 시작한다.
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent_deadline' | 'unresolved_feedback'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showRejected, setShowRejected] = useState(false);

  // 상태 변경(칸반 드래그)은 어떤 경우에도 관리자만 — 본인이 작성한 콘텐츠여도
  // 예외 없음. 칸반보드 탭 자체가 MobileShell에서 이미 관리자에게만 노출되지만,
  // 이 컴포넌트 단독으로도 안전하도록 여기서 다시 한번 막아둔다.
  const isAdminUser = user?.email === 'admin@admin.com' || user?.user_metadata?.is_admin === true;

  // ── 드래그 상태 ──
  // zoneIdx: 손가락이 현재 물리적으로 위치한 1/5 구간(band==='stage'일 때만 유효).
  // band: 손가락이 세로로 어느 영역에 있는지 — 'stage'(헤더 안, 5단계 중 하나로
  // 이동) / 'above'(헤더보다 위의 빈 영역, 검색·필터가 있던 자리 — 반려로 이송)
  // / 'below'(헤더보다 아래의 빈 영역 — 취소, 원래 값 유지). 요청 반영.
  // x/y: 고스트 카드를 그리기 위한 현재 좌표(부모 <main>의 relative 기준 좌표계).
  // phase: 'active' 중엔 5단계 헤더가 확장된 채 손가락을 따라간다. 손을 떼면
  // 'closing'으로 바뀌어 헤더가 다시 원래 크기로 줄어드는 동안만 유지되고,
  // 그 축소 애니메이션이 끝나면 완전히 null로 돌아간다.
  const [drag, setDrag] = useState<null | { item: any; originStageIdx: number; zoneIdx: number; band: 'stage' | 'above' | 'below'; x: number; y: number; phase: 'active' | 'closing' }>(null);
  const isActivePhase = drag?.phase === 'active';
  // finishDrag는 window.confirm()을 동기적으로 호출해야 해서(반려 이송 확인),
  // React state의 최신값을 setState 콜백이 아니라 매 pointermove마다 갱신하는
  // ref에서 직접 읽는다 — item/originStageIdx는 드래그 시작 시점에 고정.
  const dragMetaRef = useRef<{ item: any; originStageIdx: number } | null>(null);
  const latestLiveRef = useRef<{ zoneIdx: number; band: 'stage' | 'above' | 'below' }>({ zoneIdx: 0, band: 'stage' });
  // 3영역(반려/상태변경/유지)의 경계 — <main>이나 카드 리스트 같은 스크롤 콘텐츠의
  // 실제 높이가 아니라, 지금 화면에 "보이는" 자리 기준으로 드래그 시작 시점에 한 번만
  // 고정해서 잰다(요청 반영: "딱 폰 화면 크기를 기준으로"). top/middleBottom/bottomBound는
  // 모두 <main>의 "지금 보이는" 윗변으로부터의 거리이며, 손가락 히트 판정(뷰포트
  // 좌표계)에 그대로 쓴다 — 실제 화면에 오버레이를 그릴 때(position:absolute)는 이
  // 값에 <main>의 "지금" scrollTop을 매 렌더마다 새로 더해야 한다(아래 렌더 부분 참고).
  const dragZonesRef = useRef<{ top: number; middleBottom: number; bottomBound: number; barLeft: number; barWidth: number } | null>(null);
  const lastBandRef = useRef<'stage' | 'above' | 'below'>('stage');

  // 5단계 헤더 자체가 커지고 줄어드는 애니메이션에 쓰는 측정값 — 별도의
  // 오버레이를 새로 띄우는 게 아니라 이 헤더 엘리먼트의 height를 압축 상태와
  // 화면 전체 높이 사이로 전환한다(요청 반영).
  const barRef = useRef<HTMLDivElement | null>(null);
  // 소속/유형/긴급도 필터 + 5단계 헤더를 함께 감싸는 sticky wrapper — 롱프레스
  // 드래그 중엔 이 엘리먼트를 sticky에서 absolute로 바꿔 항상 같은 자리에 고정한다
  // (아래 3영역 고정 로직 참고).
  const stickyWrapRef = useRef<HTMLDivElement | null>(null);
  // 드래그 중 wrapper가 sticky→absolute로 바뀔 때, left:0/right:0로 폭을 다시
  // 계산하게 두면(스크롤바 유무 등에 따라) 기존 너비와 미세하게 달라질 수 있다 —
  // sticky였던 시점(드래그 시작 직전)의 실제 너비/왼쪽 위치를 스냅샷으로 남겨
  // absolute 전환 후에도 그 값을 그대로 쓴다(요청 반영: "기존 너비를 유지").
  const wrapDimsRef = useRef<{ left: number; width: number } | null>(null);
  const [compactHeight, setCompactHeight] = useState<number | null>(null);
  const [expandedHeight, setExpandedHeight] = useState<number | null>(null);
  useEffect(() => {
    const h = barRef.current?.getBoundingClientRect().height;
    if (h) setCompactHeight(h);
  }, []);

  // 필터/5단계 헤더 sticky 축소 — 아래로 스크롤하면 (선택된 필터 칩만 남기고)
  // 축약, 위로 스크롤하면 다시 펼친다. MobileShell 하단 네비게이션의 navShrunk와
  // 동일한 방향 감지 방식(임계값 4px)을 <main> 스크롤에 그대로 적용한다.
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  // 스크롤이 맨 위에서 조금이라도 벗어나면(=sticky 블록이 실제로 상단에 붙어
  // 떠 있는 상태) true — 이때만 유리(반투명+블러) 재질로 바꿔 뒤로 카드가 오르내리는
  // 것이 비치게 한다(요청 반영). 맨 위에서는 페이지의 다른 UI와 같은 불투명
  // 배경을 유지한다.
  const [isPinned, setIsPinned] = useState(false);
  useEffect(() => {
    const mainEl = barRef.current?.closest('main') as HTMLElement | null;
    if (!mainEl) return;
    let lastScrollTop = mainEl.scrollTop;
    const onScroll = () => {
      const current = mainEl.scrollTop;
      setIsPinned(current > 4);
      if (current <= 4) setFiltersCollapsed(false);
      else if (current > lastScrollTop + 4) setFiltersCollapsed(true);
      else if (current < lastScrollTop - 4) setFiltersCollapsed(false);
      lastScrollTop = current;
    };
    mainEl.addEventListener('scroll', onScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', onScroll);
  }, []);

  const frameRectRef = useRef<{ left: number; top: number; width: number } | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const longPressFired = useRef(false);
  const suppressClickRef = useRef(false);
  const lastZoneRef = useRef(0);

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleCardPointerDown = (e: React.PointerEvent, item: any, stageIdx: number) => {
    if (!isAdminUser) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pressStart.current = { x: e.clientX, y: e.clientY };
    longPressFired.current = false;
    clearPressTimer();
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      suppressClickRef.current = true;
      triggerHaptic(18);
      lastZoneRef.current = stageIdx;
      lastBandRef.current = 'stage';
      dragMetaRef.current = { item, originStageIdx: stageIdx };
      latestLiveRef.current = { zoneIdx: stageIdx, band: 'stage' };
      onDragActiveChange?.(true);

      // 3영역의 "반려" 경계(topOffset)는 검색줄·필터 패널이 열려있는지, 스크롤이
      // 얼마나 됐는지와 무관하게 항상 같아야 한다(요청 반영) — sticky일 때 실제로
      // 쓰이는 top 값(safe-area 계산 포함)을 지금(=아직 sticky인 시점, absolute로
      // 바뀌기 전) 한 번 읽어두면, 매번 정확히 같은 픽셀값을 상수로 쓸 수 있다.
      const wrapEl = stickyWrapRef.current;
      const fixedTopPx = wrapEl ? parseFloat(getComputedStyle(wrapEl).top) || 44 : 44;
      // 너비도 같은 이유로 지금(sticky 시점) 스냅샷을 남겨 absolute 전환 후에도
      // 그대로 유지한다(요청 반영).
      const wrapMainEl = wrapEl?.closest('main') as HTMLElement | null;
      if (wrapEl && wrapMainEl) {
        const wrapRect = wrapEl.getBoundingClientRect();
        const wrapMainRect = wrapMainEl.getBoundingClientRect();
        wrapDimsRef.current = { left: wrapRect.left - wrapMainRect.left, width: wrapRect.width };
      }

      setDrag({ item, originStageIdx: stageIdx, zoneIdx: stageIdx, band: 'stage', x: e.clientX, y: e.clientY, phase: 'active' });

      // isActivePhase로 전환되면 헤더가 스크롤로 줄어들어있던 75% 스케일도 즉시
      // 100%로 강제된다(위 sticky wrapper의 transform 참고) — 그 리렌더/레이아웃이
      // 반영된 다음 프레임에 측정해야 실제 100% 크기 기준의 정확한 좌표를 얻는다
      // (같은 틱에서 바로 재면 아직 75%로 축소된 옛 크기를 잴 수 있다).
      requestAnimationFrame(() => {
        const mainEl = barRef.current?.closest('main') as HTMLElement | null;
        let newExpandedHeight = 180;
        if (mainEl) {
          const byClearance = mainEl.clientHeight - BOTTOM_NAV_CLEARANCE_PX;
          const byRatio = mainEl.clientHeight * MAX_EXPANDED_RATIO;
          // "지금의 3분의 2만큼만" — 기존 계산치를 한 번 더 2/3로 줄인다(요청 반영).
          newExpandedHeight = Math.max(140, Math.min(byClearance, byRatio) * (2 / 3));
        }
        setExpandedHeight(newExpandedHeight);
        // 3영역 전부 <main>의 실제 스크롤 길이나 헤더가 지금 서 있는 자리와는
        // 무관한 상수로만 결정한다(요청 반영: "5단필터의 위치따라 영역이 줄어들거나
        // 늘어나는 것이 아니라") — top은 위에서 미리 읽어둔 고정 오프셋, 나머지도
        // 전부 mainEl의 뷰포트 높이(clientHeight)에서만 유도되는 값이라 스크롤과
        // 무관하게 매번 똑같다. 헤더 자신도 위 sticky wrapper가 드래그 중엔
        // absolute + 이 top으로 고정되므로, 실제 렌더 위치와 이 판정 기준이 항상 일치한다.
        const barRect = barRef.current?.getBoundingClientRect();
        const mainRect = mainEl?.getBoundingClientRect();
        if (mainEl && barRect && mainRect) {
          // 반려 영역 높이는 원래 sticky top 오프셋의 2배로(요청 반영), 유지
          // 영역은 하단 UI 자리만큼 비워두지 않고 화면 끝까지 "남은 영역 전부"로
          // 채운다(요청 반영, 어차피 드래그 중엔 하단 UI가 사라져 있다).
          const rejectH = fixedTopPx * 2;
          const bottomBound = mainEl.clientHeight;
          dragZonesRef.current = {
            top: rejectH,
            middleBottom: rejectH + newExpandedHeight,
            bottomBound,
            // 좌우(zoneIdx) 판정은 스크롤과 무관하게 항상 같으므로(요청은 세로 경계에
            // 대한 것) 헤더 자신의 실제 렌더 너비를 그대로 쓴다.
            barLeft: barRect.left - mainRect.left,
            barWidth: barRect.width,
          };
        }
      });
    }, LONG_PRESS_MS);
  };

  const handleCardPointerMove = (e: React.PointerEvent) => {
    if (longPressFired.current || !pressStart.current) return;
    const dx = e.clientX - pressStart.current.x;
    const dy = e.clientY - pressStart.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      clearPressTimer();
      pressStart.current = null;
    }
  };

  const handleCardPointerUp = () => {
    clearPressTimer();
    pressStart.current = null;
  };

  const handleCardPointerLeave = () => {
    if (!longPressFired.current) {
      clearPressTimer();
      pressStart.current = null;
    }
  };

  const handleCardClick = (item: any) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSelectItem(selectedItem?.id === item.id ? null : item);
  };

  const updateStatus = async (item: any, newStatus: string) => {
    if (!item || item.status === newStatus) return;
    // 롱프레스 드래그로 상태가 바뀐 기록을 content_body 안에 남겨둔다 — 카드가
    // 그 하루 동안 "00:00 A → B로 변경되었습니다" 한 줄을 인라인으로 보여주는 데 쓴다.
    let bodyObj: any = {};
    try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
    const prevLog: any[] = Array.isArray(bodyObj.statusChangeLog) ? bodyObj.statusChangeLog : [];
    const nextLog = [...prevLog, { at: new Date().toISOString(), from: item.status, to: newStatus }];
    const nextBodyStr = JSON.stringify({ ...bodyObj, statusChangeLog: nextLog });

    // 'contents' 테이블에 updated_at 컬럼이 없어(서버 select 목록 어디에도 없음)
    // 이 필드를 같이 보내면 PostgREST가 PGRST204로 거부한다 — status/content_body만 보낸다.
    setContentsList(prev => prev.map(c => (c.id === item.id ? { ...c, status: newStatus, content_body: nextBodyStr } : c)));
    const { error } = await supabase
      .from('contents')
      .update({ status: newStatus, content_body: nextBodyStr })
      .eq('id', item.id);
    if (error) {
      setContentsList(contents);
    } else {
      router.refresh();
    }
  };

  // 드래그 중에는 카드 자체가 아니라(헤더가 위를 덮으므로) window 레벨에서
  // 이동/해제를 추적한다. 'active' 단계로 들어간 시점의 item id가 바뀔 때만(=
  // 드래그 시작/종료 시점에만) 구독을 새로 걸고, zoneIdx/x/y 갱신으로는 재구독하지
  // 않도록 의존성 배열을 좁힌다.
  useEffect(() => {
    if (!drag || drag.phase !== 'active') return;

    const mainEl = barRef.current?.closest('main') as HTMLElement | null;
    const rect = mainEl?.getBoundingClientRect();
    if (rect) frameRectRef.current = { left: rect.left, top: rect.top, width: rect.width };

    const onMove = (e: PointerEvent) => {
      const fr = frameRectRef.current;
      const zones = dragZonesRef.current;
      if (!fr || !zones) return;
      e.preventDefault();
      // 좌우 구간(zoneIdx)과 상/중/하 영역(band) 판정 모두 <main> 기준 좌표(zones)를
      // 기준으로 한다 — <main>의 스크롤 위치나 카드 리스트 길이와는 무관하지만,
      // PC에서 볼 때 브라우저 전체 폭이 아니라 폰 프레임 폭 안에서만 판정되도록
      // 뷰포트 좌표를 <main> 기준으로 한 번 변환해서 비교한다(요청 반영).
      const xRel = e.clientX - fr.left;
      const yRel = e.clientY - fr.top;
      const zoneWidth = zones.barWidth / STAGES.length;
      const zoneIdx = Math.min(STAGES.length - 1, Math.max(0, Math.floor((xRel - zones.barLeft) / zoneWidth)));
      let band: 'stage' | 'above' | 'below' = 'stage';
      if (yRel < zones.top) band = 'above';
      else if (yRel > zones.middleBottom) band = 'below';
      latestLiveRef.current = { zoneIdx, band };
      if (band !== lastBandRef.current) {
        lastBandRef.current = band;
        triggerHaptic(band === 'stage' ? 12 : 16);
      } else if (band === 'stage' && zoneIdx !== lastZoneRef.current) {
        lastZoneRef.current = zoneIdx;
        triggerHaptic(12);
      }
      setDrag(prev => (prev && prev.phase === 'active' ? { ...prev, zoneIdx, band, x: e.clientX - fr.left, y: e.clientY - fr.top } : prev));
    };

    const finishDrag = () => {
      onDragActiveChange?.(false);
      setDrag(prev => (prev && prev.phase === 'active' ? { ...prev, phase: 'closing' } : prev));
      // 헤더가 압축 크기로 다시 줄어드는 CSS 트랜지션(220ms)이 끝난 뒤에만
      // 완전히 정리한다 — 곧바로 null로 바꾸면 축소 애니메이션 없이 뚝 끊겨 보인다.
      window.setTimeout(() => setDrag(null), 240);

      // 실제 상태 전환 판정은 ref에 저장된 최신값으로 — window.confirm()이
      // 동기 호출이라 setDrag 콜백 안에서 처리하면 안전하지 않다.
      const meta = dragMetaRef.current;
      const live = latestLiveRef.current;
      if (!meta) return;
      const originStage = STAGES[meta.originStageIdx];

      if (live.band === 'above') {
        triggerHaptic([10, 40, 10]);
        if (window.confirm('반려함으로 이송하시겠습니까?')) {
          updateStatus(meta.item, 'rejected');
        }
        return;
      }
      if (live.band === 'below') {
        // 취소 — 원래 값 그대로 유지, 아무 것도 하지 않는다.
        return;
      }
      const targetStage = STAGES[live.zoneIdx];
      if (targetStage.id !== originStage.id) {
        triggerHaptic([10, 40, 10]);
        // 반려 이송과 마찬가지로, 일반 상태 전환도 확인 알럿을 띄운 뒤에만
        // 반영한다(요청 반영 — 예전엔 반려만 알럿이 뜨고 이쪽은 곧바로 바뀌었다).
        if (window.confirm(`'${originStage.label}'에서 '${targetStage.label}'(으)로 상태를 변경하시겠습니까?`)) {
          updateStatus(meta.item, targetStage.dropStatus);
          setActiveStage(targetStage.id);
        }
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag && drag.phase === 'active' ? drag.item.id : null]);

  // 소속/유형/검색/긴급도 필터 — PC AdminBoardClient와 동일한 판정 기준을 그대로
  // 옮겨온다(마감 임박: D-3 이내 & 미완료/미반려, 피드백 대기: 단원이 마지막으로
  // 댓글을 남겼거나 상태가 '수정' 계열).
  const matchesFilters = (item: any) => {
    if (selectedTeam !== '전체' && !item.team?.includes(selectedTeam)) return false;
    if (selectedType !== '전체' && item.content_type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = item.title?.toLowerCase().includes(q);
      const authorMatch = item.author_name?.toLowerCase().includes(q);
      if (!titleMatch && !authorMatch) return false;
    }
    if (urgencyFilter !== 'all') {
      let bodyObj: any = {};
      try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
      if (urgencyFilter === 'urgent_deadline') {
        const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.deadline;
        const dDay = targetDate ? calculateDday(targetDate) : null;
        if (dDay === null || dDay > 3 || item.status === 'uploaded' || item.status === 'rejected') return false;
      }
      if (urgencyFilter === 'unresolved_feedback') {
        const discussions: any[] = bodyObj.discussions || [];
        const hasWriterFeedback = discussions.length > 0 && discussions[discussions.length - 1]?.role === 'writer';
        const isRevisionStatus = (item.status || '').includes('revision');
        if (!hasWriterFeedback && !isRevisionStatus) return false;
      }
    }
    return true;
  };

  const filteredContents = useMemo(
    () => contentsList.filter(matchesFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentsList, selectedTeam, selectedType, searchQuery, urgencyFilter]
  );
  const rejectedItems = useMemo(
    () => contentsList.filter(c => c.status === 'rejected' && matchesFilters(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentsList, selectedTeam, selectedType, searchQuery, urgencyFilter]
  );

  const stageCounts = useMemo(
    () => STAGES.map(stage => filteredContents.filter(c => stage.statuses.includes(c.status)).length),
    [filteredContents]
  );
  const activeStageIdx = STAGES.findIndex(s => s.id === activeStage);
  const activeItems = useMemo(
    () => filteredContents.filter(c => STAGES[activeStageIdx].statuses.includes(c.status)),
    [filteredContents, activeStageIdx]
  );

  const renderCard = (item: any, stageIdx: number, draggable: boolean = true) => {
    let bodyObj: any = {};
    try { bodyObj = JSON.parse(item.content_body || '{}'); } catch {}
    const targetDate = item.target_date || bodyObj.desiredDate || bodyObj.deadline;
    const dDay = targetDate ? calculateDday(targetDate) : null;
    const isDone = item.status === 'uploaded' || item.status === 'rejected';
    const platformStyle = getPlatformStyle(item.team);
    const triggerText = getItemTriggerInfo(item);
    const isSelected = selectedItem?.id === item.id;
    const isBeingDragged = drag?.item.id === item.id;

    const isFinal = item.status === 'completed' || item.status === 'uploaded' || item.status === 'final_submitted';
    const hasDriveLink = !!(item.final_url || (item.content_body && item.content_body.includes('http')));
    let authorEmail = '';
    try { authorEmail = bodyObj.authorEmail || ''; } catch {}
    const isOwnContent = !!(user?.email && authorEmail && user.email === authorEmail);
    const canManage = isAdminUser || isOwnContent;

    // 오늘 안에 롱프레스 드래그로 상태가 바뀐 적이 있으면 그 마지막 변경 내역을
    // 카드 하단에 텍스트 한 줄만큼만 인라인으로 덧붙인다(요청 반영).
    const changeLog: any[] = Array.isArray(bodyObj.statusChangeLog) ? bodyObj.statusChangeLog : [];
    const lastChange = changeLog.length > 0 ? changeLog[changeLog.length - 1] : null;
    const isChangeToday = !!lastChange && new Date(lastChange.at).toDateString() === new Date().toDateString();

    return (
      <div
        key={item.id}
        onPointerDown={draggable ? e => handleCardPointerDown(e, item, stageIdx) : undefined}
        onPointerMove={draggable ? handleCardPointerMove : undefined}
        onPointerUp={draggable ? handleCardPointerUp : undefined}
        onPointerLeave={draggable ? handleCardPointerLeave : undefined}
        onClick={() => handleCardClick(item)}
        style={{ touchAction: 'pan-y' }}
        className={`rounded-xl shadow-xs transition-[background-color,box-shadow,opacity] cursor-pointer overflow-hidden select-none ${
          isBeingDragged ? 'opacity-20' : ''
        } ${
          isSelected
            ? 'bg-slate-100 dark:bg-white/10 ring-2 ring-slate-800 dark:ring-white/40'
            : 'bg-slate-50 dark:bg-[#282A30]/70 hover-fine:bg-slate-100 dark:hover-fine:bg-[#282A30]'
        }`}
      >
        <div className="p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-white dark:bg-[#202227] flex items-center justify-center flex-shrink-0 shadow-2xs">
                {platformStyle.icon}
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-[#202227] px-1.5 py-0.5 rounded-md text-[10.5px] truncate shadow-2xs">
                {item.content_type || '콘텐츠'}
              </span>
            </div>
            {!isDone && dDay !== null && (
              <span className={`flex-shrink-0 font-bold text-[10.5px] ${
                dDay <= 0 ? 'text-rose-600 dark:text-rose-400' : dDay <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {dDay < 0 ? `D+${Math.abs(dDay)} 지연` : dDay === 0 ? 'D-Day' : `D-${dDay}`}
              </span>
            )}
          </div>

          <div className="text-sm font-bold leading-snug truncate text-slate-900 dark:text-slate-100">{item.title}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
            {formatCleanCrewName(item.author_name)}
          </div>

          <div className="text-[10.5px] font-semibold flex items-center gap-1 min-w-0 bg-slate-100/90 dark:bg-[#1E2025] text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg">
            <span className="truncate">{triggerText}</span>
          </div>

          {isChangeToday && (
            <div className="text-[10px] font-medium flex items-center gap-1 min-w-0 text-blue-700 dark:text-blue-300">
              <span className="flex-shrink-0">ℹ️</span>
              <span className="truncate">
                {formatChangeTime(lastChange.at)} {STATUS_LABELS[lastChange.from] || lastChange.from} → {STATUS_LABELS[lastChange.to] || lastChange.to}로 변경되었습니다.
              </span>
            </div>
          )}
        </div>

        {isSelected && (
          <div className="px-3 pb-3 pt-0.5 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onOpenDetail(item, 'proposal')}
              className="flex-1 h-9 rounded-lg bg-[#FFB800] border border-[#E6A600] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
              title="기획안 상세보기"
            >
              <span className="text-base">📋</span>
            </button>
            {isFinal && hasDriveLink ? (
              <button
                onClick={() => onOpenDetail(item, 'final')}
                className="flex-1 h-9 rounded-lg bg-[#003378] border border-[#002454] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                title="완성본 상세보기"
              >
                <DriveColorIcon />
              </button>
            ) : canManage ? (
              <button
                onClick={() => onOpenSubmit('final', item)}
                className="flex-1 h-9 rounded-lg bg-[#EBF3FF] border border-[#C0CFE4] flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xs"
                title="완성본 업로드"
              >
                <span className="text-base">📤</span>
              </button>
            ) : (
              <div className="flex-1 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                <DriveLockedIcon />
              </div>
            )}
            <button
              onClick={() => onOpenComments(item)}
              className="flex-1 h-9 rounded-lg border-2 bg-white border-slate-300 flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-sm"
              title="코멘트"
            >
              <span className="text-sm">💬</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const barTargetHeight = isActivePhase ? (expandedHeight ?? compactHeight ?? undefined) : (compactHeight ?? undefined);

  // 소속/유형/긴급도 필터의 "선택됨" 흰색 배경 — 롱프레스로 드래그하는 동안엔 위
  // 반려 영역을 덮는 어두운 레이어를 뚫고 흰색이 그대로 비쳐 보여 눈에 튀었다(요청
  // 반영). 드래그 중엔 선택 안 된 항목의 연한 회색보다 더 짙은 회색으로 바꿔,
  // 흰색도 아니고 평소의 "선택 안 됨" 색도 아닌 "지금은 조작할 수 없음" 느낌을 준다.
  const filterChipClass = (isSelected: boolean) => {
    if (!isSelected) return 'bg-slate-100 dark:bg-[#282A30] text-slate-600 dark:text-slate-300';
    if (isActivePhase) return 'bg-slate-500 dark:bg-slate-600 text-white';
    return 'bg-slate-900 dark:bg-white text-white dark:text-slate-900';
  };

  // 스크롤 축소 상태에서 남길 "전체가 아닌" 필터 칩만 모은다(요청 반영).
  const activeFilterChips: { key: string; label: string; onClear: () => void }[] = [];
  if (selectedTeam !== '전체') activeFilterChips.push({ key: 'team', label: selectedTeam, onClear: () => setSelectedTeam('전체') });
  if (selectedType !== '전체') activeFilterChips.push({ key: 'type', label: selectedType, onClear: () => setSelectedType('전체') });
  if (urgencyFilter !== 'all') {
    activeFilterChips.push({
      key: 'urgency',
      label: URGENCY_FILTERS.find(f => f.value === urgencyFilter)?.label || urgencyFilter,
      onClear: () => setUrgencyFilter('all'),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* MobileShell이 칸반보드에서만 <main>의 safe-pt(상단 패딩)를 0으로 낮춰준
          만큼을 여기서 일반 콘텐츠로 대신 그린다 — 검색줄과 함께 스크롤되어
          사라지므로, 아래 sticky 필터/5단계 헤더가 스크롤 시 화면 맨 위까지
          정확히 닿을 수 있다(요청 반영, MobileShell.tsx의 관련 주석 참고). */}
      <div style={{ height: 'max(env(safe-area-inset-top), 2.75rem)' }} />

      {/* ── 검색 ── 드래그 중 손가락이 이 위(헤더보다 위) 영역에 있으면 "반려함으로
          이송" 안내를 이 영역 자체에 덧씌운다(요청 반영, 고스트 카드 문구만으로는
          부족하다는 피드백). 소속/유형/긴급도 필터·5단계 헤더는 아래 sticky
          블록으로 분리되어 스크롤 시 이 검색줄만 위로 흘러나간다. */}
      <div className="relative">
        <div className={`flex items-center gap-2 transition-opacity duration-200 ${isActivePhase ? 'opacity-25 pointer-events-none' : 'opacity-100'}`}>
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="제목, 작성자 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-7 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-[#002454] transition-[border-color,box-shadow] shadow-2xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">✕</button>
            )}
          </div>
          {/* 반려함 — 필터 버튼 옆 원래 자리, 아이콘 전용(요청 반영). 내용물(반려
              목록 서랍)은 별도 레이어로 필터 패널 아래·5단계 헤더 위에 따로 있다. */}
          <button
            onClick={() => setShowRejected(v => !v)}
            aria-label="반려함"
            title={`반려함 (${rejectedItems.length})`}
            className={`relative flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              showRejected
                ? 'bg-rose-100 dark:bg-rose-950/60 ring-2 ring-rose-400'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className="text-sm">🚫</span>
            {rejectedItems.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-600 text-white text-[8px] font-black flex items-center justify-center">
                {rejectedItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            aria-label="필터"
            title="필터"
            className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              showFilters || selectedTeam !== '전체' || selectedType !== '전체' || urgencyFilter !== 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="8" cy="6" r="1.8" fill="currentColor" stroke="none" />
              <circle cx="16" cy="12" r="1.8" fill="currentColor" stroke="none" />
              <circle cx="10" cy="18" r="1.8" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 반려함 서랍 — 검색/필터 패널과는 다른 별도의 레이어. 그 패널 안이 아니라
          아래, 그리고 5단계 헤더보다는 위에 위치한다(요청 반영). PC AdminBoardClient의
          반려 목록과 동일하게 5단계 어디에도 속하지 않는 'rejected' 상태만 보여준다. */}
      {showRejected && (
        <div className="bg-red-50/90 dark:bg-red-950/40 rounded-2xl p-3 border border-red-200 dark:border-red-800/80 animate-in fade-in duration-200 flex flex-col gap-2">
          <h3 className="m-0 text-xs font-black text-red-700 dark:text-red-300 flex items-center gap-1.5">
            <span>🚫</span> 반려된 콘텐츠 ({rejectedItems.length})
          </h3>
          {rejectedItems.length > 0 ? (
            rejectedItems.map(item => renderCard(item, -1, false))
          ) : (
            <div className="text-center text-xs font-bold text-red-400 py-4">반려된 콘텐츠가 없습니다.</div>
          )}
        </div>
      )}

      {/* ── 소속/유형/긴급도 필터 + 5단계 헤더 — 함께 sticky로 상단에 고정된다.
          아래로 스크롤하면(요청 반영) 필터 패널은 '전체'가 아닌 칩만 남긴 축약형으로
          바뀌어 5단계 헤더 "아래"에 자리하고(요청 반영 — 펼쳐진 3줄 전체 패널은
          반대로 헤더 위), 위로 스크롤하면 다시 3줄 전체 패널로 펼쳐진다.
          이 wrapper 자체는 배경이 전혀 없다 — 뒤에 별도 배경 레이어를 깔지 않고,
          고정(isPinned)된 동안 칩/헤더 각자가 유리 재질로 점진적으로 전환되며
          (transition에 backdrop-filter·box-shadow·border-color까지 포함) 그 사이
          빈틈으로 카드가 비쳐 보인다. 유리 전환과 함께 하단 네비게이션 navShrunk와
          동일한 원리로 75% 크기로 축소된다(요청 반영) — 위쪽 경계가 고정된 채
          줄어들도록 transform-origin을 top center로 둔다. */}
      <div
        ref={stickyWrapRef}
        className="z-30 flex flex-col gap-2 pb-1 transition-transform duration-200 ease-out"
        style={{
          // 평소엔 sticky로 화면 상단에 붙지만, 롱프레스 드래그 중(isActivePhase)엔
          // absolute로 바꿔 <main>의 지금 스크롤 위치와 무관하게 "항상 같은 자리"에
          // 고정한다(요청 반영) — 검색줄/필터 패널이 열려있는지, 스크롤이 얼마나
          // 됐는지에 따라 헤더가 서 있는 자리가 들쭉날쭉했던 것을, 드래그 중만큼은
          // 반려/상태변경/유지 3영역이 매번 똑같은 위치·크기를 갖도록 고정한다.
          // 반려 영역 높이가 sticky top 오프셋의 2배로 늘어난 만큼(요청 반영,
          // 아래 dragZonesRef 계산 참고), 헤더 자신도 드래그 중엔 그 2배 지점에서
          // 시작해야 반려 영역과 겹치지 않고 정확히 이어진다. absolute는 스크롤
          // 컨테이너의 "지금 보이는" 윗변이 아니라 "스크롤되지 않은 콘텐츠 원점"
          // 기준으로 좌표가 매겨지므로(실측 확인), 렌더마다 지금의 scrollTop을
          // 더해 보정한다(아래 3영역 오버레이와 동일한 이유).
          position: isActivePhase ? 'absolute' : 'sticky',
          top: isActivePhase
            ? `calc(max(env(safe-area-inset-top), 2.75rem) * 2 + ${(barRef.current?.closest('main') as HTMLElement | null)?.scrollTop ?? 0}px)`
            : 'max(env(safe-area-inset-top), 2.75rem)',
          // sticky였던 시점의 실제 왼쪽 위치/너비를 그대로 쓴다 — left:0/right:0으로
          // <main>의 패딩 경계에 맞춰 다시 계산하게 두면 미세하게 너비가 달라질 수
          // 있어(요청 반영: "기존 너비를 유지"), 드래그 시작 직전 스냅샷(wrapDimsRef)을
          // 그대로 고정폭으로 쓴다.
          left: isActivePhase && wrapDimsRef.current ? wrapDimsRef.current.left : 0,
          width: isActivePhase && wrapDimsRef.current ? wrapDimsRef.current.width : undefined,
          right: isActivePhase && wrapDimsRef.current ? undefined : 0,
          // 스케일은 스크롤 "방향"에 즉시 반응하는 filtersCollapsed를 그대로 따른다 —
          // 아래로 내리면 바로 75%로, 위로 조금만 올려도 맨 위까지 돌아가길 기다리지
          // 않고 바로 100%로 복귀한다(요청 반영). 유리 재질 여부(isPinned)는 이와
          // 별개로 "맨 위인지 아닌지"만 본다 — 100%로 돌아온 뒤에도 맨 위가 아니면
          // 계속 유리 재질을 유지한다. 단, 롱프레스로 드래그 중(isActivePhase)일 때는
          // 스크롤이 어디에 있었든 항상 100%로 강제한다(요청 반영) — 5단계 헤더가
          // 세로로 길어지는 드래그 대상 자체이므로, 75%로 줄어든 채로 확장되면
          // 실제 렌더 크기와 3영역 판정 기준(뷰포트 좌표)이 서로 어긋난다.
          transform: isActivePhase ? 'scale(1)' : filtersCollapsed ? 'scale(0.75)' : 'scale(1)',
          transformOrigin: 'top center',
        }}
      >
        {/* 롱프레스 드래그 중엔 필터 패널(또는 축약 칩)을 아예 렌더하지 않는다 —
            이 패널이 계속 떠 있으면 같은 wrapper 안에서 5단계 헤더를 아래로
            밀어내, 위 3영역 고정 좌표(fixedTopPx)와 실제 헤더 위치가 어긋난다
            (요청 반영: "5단필터의 위치따라 영역이 줄어들거나 늘어나는 것이 아니라"). */}
        {showFilters && !filtersCollapsed && !isActivePhase && (
          <div className={`flex flex-col gap-1.5 transition-[background-color,backdrop-filter,box-shadow,border-color] duration-[260ms] ease-out animate-in fade-in slide-in-from-top-1 duration-150 ${
            isPinned ? 'glass-cta rounded-xl p-2' : ''
          }`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 flex-shrink-0 w-8">소속</span>
              {TEAM_FILTERS.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTeam(t)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors duration-150 ${filterChipClass(selectedTeam === t)}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 flex-shrink-0 w-8">유형</span>
              {TYPE_FILTERS.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors duration-150 ${filterChipClass(selectedType === t)}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 flex-shrink-0 w-8">긴급도</span>
              {URGENCY_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setUrgencyFilter(f.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors duration-150 ${filterChipClass(urgencyFilter === f.value)}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 별도의 오버레이가 아니라 이 엘리먼트 자체가 롱프레스 시 height를 압축
            크기→화면 전체 높이로 전환하며 커진다(요청 반영). 물리적인 1/5 드롭
            판정 영역은 항상 이 엘리먼트의 최종 크기 기준으로 계산되고, 시각
            효과(활성 구간만 확대)만 애니메이션을 탄다. isPinned일 때(드래그 중이
            아니어도) 압축 상태 배경이 유리 재질로 점진적으로 바뀐다. */}
        <div
          ref={barRef}
        className={`flex overflow-hidden transition-[height,border-radius,padding,gap,background-color,backdrop-filter,box-shadow,border-color] duration-[260ms] ease-out ${
          isActivePhase
            ? 'glass-cta glass-cta-strong rounded-2xl p-0 gap-0'
            : isPinned
            ? 'glass-cta rounded-xl p-1 gap-1'
            : 'bg-slate-200/70 dark:bg-[#202227] rounded-xl p-1 gap-1'
        }`}
        style={{ height: barTargetHeight }}
      >
        {STAGES.map((stage, idx) => {
          const hasStageHover = drag?.band === 'stage';
          const isActiveZone = hasStageHover && idx === drag?.zoneIdx;
          const isCompactActiveTab = activeStage === stage.id;
          return (
            <div
              key={stage.id}
              onClick={() => { if (!isActivePhase) setActiveStage(stage.id); }}
              className={`flex flex-col items-center justify-center min-w-0 cursor-pointer transition-[flex,background-color,border-radius,opacity] duration-[220ms] ease-out ${
                isActivePhase
                  ? // 손가락이 실제로 5단계 중 하나 위에 있을 때만(hasStageHover) 나머지
                    // 항목을 눈에 띄게 더 어둡게 낮춰 대비를 키운다(요청 반영) — 손가락이
                    // 위/아래(반려·유지) 영역에 있어 특별히 "호버 중"인 항목이 없을 때는
                    // 다섯 칸 모두 이전과 같은 중간 밝기를 유지한다.
                    `border-r border-slate-900/5 dark:border-white/10 last:border-r-0 ${
                      isActiveZone
                        ? 'bg-white/60 dark:bg-white/15'
                        : hasStageHover
                        ? // 투명도만 낮추던 것에 더해(요청 반영), 배경 자체를 짙은 회색으로
                          // 채워 대비를 한층 더 키운다 — 컨테이너 전체에 opacity를 같이
                          // 걸면 이 배경색까지 함께 옅어져버려(곱연산) 배경만 따로 색을 준다.
                          'bg-slate-900/40 dark:bg-black/50'
                        : 'opacity-45'
                    }`
                  : `rounded-lg py-1.5 ${isCompactActiveTab ? 'bg-white/70 dark:bg-white/15 shadow-xs' : ''}`
              }`}
              style={{ flex: isActivePhase ? (isActiveZone ? 5 : 1) : 1 }}
            >
              <span className={`leading-none transition-[font-size] duration-200 ${
                isActivePhase ? (isActiveZone ? 'text-3xl mb-1.5' : 'text-lg mb-1') : 'text-sm mb-0.5'
              }`}>
                {stage.icon}
              </span>
              <span className={`font-black text-center px-1 truncate w-full transition-colors duration-200 ${
                isActivePhase
                  ? `text-slate-900 dark:text-white ${isActiveZone ? 'text-xs' : 'text-[9px]'}`
                  : `text-[10.5px] ${isCompactActiveTab ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`
              }`}>
                {isActivePhase ? (isActiveZone ? stage.label : stage.short) : stage.short}
              </span>
              {!isActivePhase && <span className="text-[9px] opacity-70 text-slate-500 dark:text-slate-400">{stageCounts[idx]}</span>}
            </div>
          );
        })}
        </div>

        {/* '전체'가 아닌 필터만 남긴 축약 표시 — 5단계 헤더 "아래"에 위치(요청 반영).
            기본 필터(3줄 전체 패널)와 이 축약 칩은 항상 둘 중 하나만 뜬다(요청
            반영, 한때 필터가 펼쳐진 채로도 같이 보여준 적이 있었는데 되돌렸다) —
            스크롤을 내리면(filtersCollapsed) 칩만, 올리면 기본 필터 패널만 보인다.
            재질은 나머지 sticky 블록(필터 패널·5단계 헤더)과 같은 기준을 따른다 —
            isPinned일 때만 유리 재질, 맨 위(!isPinned)일 때는 소속/유형/긴급도 버튼의
            "선택됨" 상태와 같은 불투명 스타일을 써서 두 상태 모두 나머지 UI와
            일관되게 보이도록 한다. */}
        {showFilters && filtersCollapsed && activeFilterChips.length > 0 && !isActivePhase && (
          <div className="flex items-center gap-1.5 flex-wrap animate-in fade-in duration-150">
            {activeFilterChips.map(c => (
              <button
                key={c.key}
                onClick={c.onClear}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-[background-color,backdrop-filter,box-shadow,border-color,color] duration-[260ms] ease-out ${
                  isPinned ? 'glass-cta text-slate-900 dark:text-white' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                }`}
              >
                <span>{c.label}</span>
                <span className="opacity-70">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 선택된 단계의 카드 리스트 ── */}
      <div className="relative">
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${isActivePhase ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          {activeItems.length > 0 ? (
            activeItems.map(item => renderCard(item, activeStageIdx))
          ) : (
            <div className="bg-white dark:bg-[#282A30]/70 rounded-xl p-8 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
              해당 단계에 항목이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* ── 3영역 레이어 — 반려(위)/상태변경(중간, 5단계 헤더 그 자체)/유지(아래).
          셋 다 검색줄·필터 패널이 열려있는지나 스크롤 위치와 무관하게 매번 같은
          위치·크기를 갖는 고유 영역이다 — 5단계 헤더 자신도(위 sticky wrapper 참고)
          드래그 중엔 항상 이 중간 영역의 top과 정확히 같은 자리에 고정되므로, 셋의
          경계가 서로 어긋나지 않는다. 반려 영역 높이는 원래 sticky top 오프셋의
          2배(요청 반영), 유지 영역은 하단 UI 자리를 남겨두지 않고 화면 끝까지
          "남은 영역 전부"를 채운다(요청 반영 — 드래그 중엔 하단 UI가 이미 사라져
          있으므로). 반려 영역은 카드가 그 위에 없는 기본 상태에선 유지 영역과
          똑같이 박스 모양 없는 평평한 레이어이고(요청 반영), 카드가 호버해 들어올
          때만 아래 반려함 서랍(showRejected)과 같은 디자인 — 5단계 헤더와 너비를
          맞춘(inset-x-0) 둥근 박스에 반려함 본연의 빨간색 — 으로 바뀐다(요청 반영).
          position:fixed(진짜 브라우저 뷰포트 기준)를 쓰면 PC로 볼 때
          가운데 떠 있는 폰 프레임을 넘어 브라우저 창 전체 폭으로 번져서(요청 반영으로
          발견) position:absolute로 <main>(position:relative) 기준 좌표를 쓴다.
          position:absolute 자식의 top은 <main>의 "지금 보이는" 윗변이 아니라
          스크롤되지 않은 콘텐츠 원점 기준이라(실측 확인), 매 렌더마다 지금 이 순간의
          scrollTop을 다시 읽어 더해야 화면에 보이는 자리가 어긋나지 않는다. */}
      {isActivePhase && drag && dragZonesRef.current && (
        <>
          <div
            className="absolute inset-x-0 z-40 pointer-events-none overflow-hidden"
            style={{ top: (barRef.current?.closest('main') as HTMLElement | null)?.scrollTop ?? 0, height: Math.max(0, dragZonesRef.current.top) }}
          >
            {/* 카드가 지금 이 위에 없으면 유지 영역과 똑같은(박스 아닌, 화면
                끝까지 번지는 평평한) 디자인으로 표시하고(요청 반영), 카드가
                호버해 들어오면 그때만 반려함 서랍(위 showRejected 블록)과 같은
                디자인 — 여백을 둔 둥근 박스에 반려함 본연의 빨간색 — 으로 바뀐다. */}
            {drag.band === 'above' ? (
              <div className="absolute inset-x-0 inset-y-1 rounded-2xl flex items-center justify-center gap-1.5 border bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-800/80">
                <span className="flex items-center gap-1 text-xs font-black text-red-700 dark:text-red-300">
                  <span>🚫</span> 반려
                </span>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/15">
                <span className="flex items-center gap-1 text-xs font-black text-white/60">
                  <span>🚫</span> 반려
                </span>
              </div>
            )}
          </div>
          <div
            className="absolute inset-x-0 z-40 pointer-events-none overflow-hidden"
            style={{
              top: dragZonesRef.current.middleBottom + ((barRef.current?.closest('main') as HTMLElement | null)?.scrollTop ?? 0),
              height: Math.max(0, dragZonesRef.current.bottomBound - dragZonesRef.current.middleBottom),
            }}
          >
            {/* 반려 영역과 달리 여기는 "박스"처럼 보이지 않게 한다(요청 반영,
                시각적으로만 — 색이 옅어지고 짙어지는 동작 자체는 그대로) 화면
                끝까지 번지는 평평한 레이어로, 둥근 모서리·여백 없이. */}
            <div className={`absolute inset-0 flex items-center justify-center gap-1.5 transition-colors duration-150 ${
              drag.band === 'below' ? 'bg-slate-700/55' : 'bg-black/15'
            }`}>
              <span className={`flex items-center gap-1 text-xs font-black transition-colors duration-150 ${
                drag.band === 'below' ? 'text-white' : 'text-white/60'
              }`}>
                <span>↩️</span> 유지
              </span>
            </div>
          </div>
        </>
      )}

      {/* 손가락을 따라다니는 고스트 카드 — <main> 기준 좌표계. 헤더 위(반려)/아래(취소)
          빈 영역에 있을 때는 카드 자체의 색과 안내 문구로 무슨 일이 벌어질지 알려준다. */}
      {isActivePhase && drag && (
        <div
          className="absolute z-40 pointer-events-none"
          style={{ left: drag.x, top: drag.y, transform: 'translate(-50%, -60%) rotate(-3deg) scale(1.02)', width: 200 }}
        >
          <div className={`rounded-xl shadow-2xl p-3 border-2 ${
            drag.band === 'above'
              ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-500'
              : drag.band === 'below'
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500'
              : 'bg-white dark:bg-[#282A30] border-slate-900/80 dark:border-white/60'
          }`}>
            <div className={`text-xs font-black truncate ${drag.band === 'above' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>
              {drag.item.title}
            </div>
            {drag.band === 'above' ? (
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-300 mt-0.5">🚫 반려로 이송</div>
            ) : drag.band === 'below' ? (
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">↩️ 여기 놓으면 유지(취소)</div>
            ) : (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{drag.item.content_type || '콘텐츠'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
