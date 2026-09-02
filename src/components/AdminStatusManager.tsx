'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'pending', label: '⏳ 기획안 대기' },
  { value: 'revision', label: '✏️ 기획안 수정요청' },
  { value: 'rejected', label: '🚫 반려' },
  { value: 'approved', label: '✅ 기획안 통과' },
  { value: 'final_submitted', label: '🎬 완성본 제출됨' },
  { value: 'final_revision', label: '🛠️ 완성본 수정요청' },
  { value: 'completed', label: '🚀 업로드 대기' },
  { value: 'uploaded', label: '🎉 업로드 완료' },
];

// 변경 알림은 컴포넌트 바깥에 보관한다. 저장에 성공하면 router.refresh()가
// 목록을 다시 불러오면서 이 컴포넌트가 재마운트되는데, useState에만 담아 두면
// 그 순간 알림이 사라져 되돌리기를 누를 새가 없었다(실측 확인). 콘텐츠 id로
// 보관해 두면 재마운트 뒤에도 남은 시간만큼 알림이 이어진다.
type StatusNotice =
  | { kind: 'ok'; undoTo: string; at: number }
  | { kind: 'err'; text: string; at: number };

const NOTICE_MS = 8000;
const NOTICE_STORE = new Map<string, StatusNotice>();

export default function AdminStatusManager({ 
  item, 
  onStatusChange, 
  onDelete 
}: { 
  item: any; 
  onStatusChange?: (newStatus: string) => void;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState(item.status);
  const [isSaving, setIsSaving] = useState(false);

  // 상태는 드롭다운을 건드리는 즉시 저장된다. 저장됐다는 표시도, 잘못 눌렀을 때
  // 되돌릴 방법도 없으면 한 화면에 수십 줄이 붙어 있는 목록에서 오조작을 알아챌
  // 수가 없다. 변경 직후 잠깐 뜨는 알림과 되돌리기를 함께 둔다.
  const noticeKey = String(item.id);
  const [notice, setNotice] = useState<StatusNotice | null>(() => {
    const saved = NOTICE_STORE.get(noticeKey);
    if (saved && Date.now() - saved.at < NOTICE_MS) return saved;
    if (saved) NOTICE_STORE.delete(noticeKey);
    return null;
  });
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (next: StatusNotice | null) => {
    if (next) NOTICE_STORE.set(noticeKey, next);
    else NOTICE_STORE.delete(noticeKey);
    setNotice(next);
  };

  // 남은 시간만큼만 타이머를 건다 — 재마운트로 이어받은 알림도 제때 사라진다.
  useEffect(() => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (!notice) return;
    const remain = Math.max(0, NOTICE_MS - (Date.now() - notice.at));
    noticeTimer.current = setTimeout(() => {
      NOTICE_STORE.delete(noticeKey);
      setNotice(null);
    }, remain);
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [notice, noticeKey]);

  const updateStatus = async (newStatus: string, isUndo = false) => {
    if (newStatus === status || isSaving) return;
    // 실패하면 이 값으로 되돌린다 — item.status(최초 값)로 되돌리면 이미
    // 여러 번 바꾼 뒤에는 엉뚱한 상태로 튄다.
    const prevStatus = status;
    setIsSaving(true);
    setStatus(newStatus);

    const { error } = await supabase
      .from('contents')
      .update({ status: newStatus })
      .eq('id', item.id);

    setIsSaving(false);

    if (error) {
      // Supabase가 주는 영어 원문 대신, 무엇을 하면 되는지 한국어로 알린다.
      // 원문은 개발자가 볼 수 있게 콘솔에만 남긴다.
      console.error('[AdminStatusManager] 상태 변경 실패:', error);
      setStatus(prevStatus);
      showNotice({ kind: 'err', text: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', at: Date.now() });
    } else {
      showNotice(isUndo ? null : { kind: 'ok', undoTo: prevStatus, at: Date.now() });
      if (onStatusChange) onStatusChange(newStatus);
      router.refresh();
    }
  };

  const statusLabel = (v: string) =>
    STATUS_OPTIONS.find(o => o.value === v)?.label ?? v;

  // ◀▶는 툴팁이 약속하는 대로 "한 단계씩"만 움직여야 한다. 예전에는 핸들러의
  // 이동 규칙과 버튼의 disabled 조건이 각각 따로 하드코딩되어 있어 서로 어긋났고,
  // 그 결과 ◀가 '업로드 완료'에서 '업로드 대기'를 건너뛰고 '기획안 통과'까지
  // 세 단계를 되돌리는 문제가 있었다. 이제 아래 표 하나에서 두 값을 모두
  // 끌어내므로 규칙과 버튼 상태가 다시 어긋날 수 없다.
  //
  // 주 흐름은 네 단계다. 수정요청·반려·완성본 제출됨은 이 흐름 위에 얹힌
  // 곁가지 상태라, 각자 어느 단계에 속하는지만 정해 두고 되돌릴 때는 먼저
  // 그 단계의 기본 상태로 돌아온다.
  const FLOW = ['pending', 'approved', 'completed', 'uploaded'];
  const STAGE_OF: Record<string, number> = {
    pending: 0, revision: 0, rejected: 0,
    approved: 1, final_submitted: 1, final_revision: 1,
    completed: 2,
    uploaded: 3,
  };

  const stage = STAGE_OF[status] ?? 0;
  const isStageBase = FLOW[stage] === status;

  // 곁가지 상태(수정요청 등)라면 먼저 그 단계의 기본 상태로 되돌린다.
  const prevStatus = !isStageBase ? FLOW[stage] : (stage > 0 ? FLOW[stage - 1] : null);

  // ▶가 닿는 범위는 '업로드 대기'까지다 — 마지막 단계인 '업로드 완료'는 제외한다.
  // DB에 저장되는 상태값 목록과, 화살표로 오갈 수 있는 단계는 의도적으로 범위가
  // 다르다. 실제 업로드 여부는 관리자가 확인한 뒤 드롭다운으로 직접 지정하는
  // 것이라, 승인 흐름에 끼워 넣지 않는다. (FLOW.length - 2)
  const nextStatus = stage < FLOW.length - 2 ? FLOW[stage + 1] : null;

  const handlePrevStatus = () => {
    if (prevStatus) updateStatus(prevStatus);
  };

  const handleNextStatus = () => {
    if (nextStatus) updateStatus(nextStatus);
  };

  return (
    <div style={{
      backgroundColor: 'var(--color-card-bg)',
      borderRadius: '14px',
      border: 'none',
      padding: '6px 10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      position: 'relative'
    }}>
      {/* 변경 알림 — 행 높이를 바꾸지 않도록 컨트롤 바 아래에 띄운다. */}
      {notice && (
        <div
          role="status"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '0.72rem',
            fontWeight: 600,
            backgroundColor: notice.kind === 'ok' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
            color: notice.kind === 'ok' ? '#059669' : '#DC2626',
            border: `1px solid ${notice.kind === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
          }}
        >
          {notice.kind === 'ok' ? (
            <>
              <span>변경됨</span>
              <button
                type="button"
                onClick={() => updateStatus(notice.undoTo, true)}
                disabled={isSaving}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  color: 'inherit',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textDecoration: 'underline'
                }}
              >
                되돌리기 ({statusLabel(notice.undoTo)})
              </button>
            </>
          ) : (
            <span>{notice.text}</span>
          )}
        </div>
      )}
      {/* Control bar: Left arrow + Dropdown + Right arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
        <button
          type="button"
          onClick={handlePrevStatus}
          className="status-step-btn"
          disabled={isSaving || !prevStatus}
          title="이전 단계로 롤백"
          aria-label="이전 단계로 롤백"
          style={{
            border: 'none',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
            borderRadius: '6px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (isSaving || !prevStatus) ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: 800,
            transition: 'all 0.15s',
            opacity: (isSaving || !prevStatus) ? 0.5 : 1
          }}
        >
          ◀
        </button>

        <select
          value={status}
          onChange={(e) => updateStatus(e.target.value)}
          disabled={isSaving}
          aria-label={`${item.title ?? '콘텐츠'} 상태 변경`}
          style={{
            flex: 1,
            // 이 폭이 없으면 "🎬 완성본 제출됨"이 "🎬 완성본 제…"로 잘려
            // 목록에서 현재 상태를 구분할 수 없다.
            minWidth: '132px',
            padding: '2px 6px',
            fontSize: '0.78rem',
            fontWeight: 500,
            height: '28px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'var(--input-glass-bg)',
            color: 'var(--color-text-main)',
            cursor: 'pointer'
          }}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleNextStatus}
          className="status-step-btn"
          disabled={isSaving || !nextStatus}
          title="다음 단계로 승인"
          aria-label="다음 단계로 승인"
          style={{
            border: 'none',
            backgroundColor: (isSaving || !nextStatus) ? 'var(--color-surface)' : '#1E3A8A',
            color: (isSaving || !nextStatus) ? 'var(--color-text-muted)' : 'white',
            borderRadius: '6px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (isSaving || !nextStatus) ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: 800,
            transition: 'all 0.15s'
          }}
        >
          ▶
        </button>
      </div>

      {/* Delete button (when provided) */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="이 콘텐츠 삭제"
          style={{
            border: 'none',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#EF4444',
            borderRadius: '6px',
            padding: '0 8px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          삭제
        </button>
      )}
    </div>
  );
}
