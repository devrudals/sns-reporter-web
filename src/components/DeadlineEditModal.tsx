'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

// 모바일 대시보드(MobileDashboard.tsx)의 마감일 조정 레이어를 PC에도 그대로
// 이식한 것 — 기획안 마감과 완성본 마감은 서로 다른 레이어로 각각 뜬다(요청
// 반영: PC에서도 클릭 시 설정하는 레이어가 각각 나오게). /api/deadlines가
// 하나의 레코드에 두 종류의 마감을 함께 저장하므로, 저장할 때 GET으로 불러온
// 전체 값을 유지한 채 지금 편집 중인 타입의 필드만 바꿔서 보낸다 — 그래야
// 기획안 마감을 고칠 때 완성본 마감이 덮어써지지 않는다.
//
// document.body로 포탈해서 렌더링한다 — 이 모달을 여는 카드들(motion-card)이
// :hover에서 transform을 걸어(globals.css) position:fixed 자식의 containing
// block을 그 작은 카드로 바꿔버린다. 포탈 없이 카드 안에 그냥 두면 모달이
// 화면 전체가 아니라 카드 박스 안에 갇혀 사실상 보이지 않는 문제가 있었다.
interface DeadlineEditModalProps {
  type: 'proposal' | 'final';
  onClose: () => void;
}

export default function DeadlineEditModal({ type, onClose }: DeadlineEditModalProps) {
  const router = useRouter();
  const [editingDeadlines, setEditingDeadlines] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/deadlines');
        const data = await res.json();
        if (!cancelled) setEditingDeadlines(data);
      } catch (e) {}
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!editingDeadlines) return;
    setSaving(true);
    try {
      await fetch('/api/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDeadlines),
      });
      onClose();
      router.refresh();
    } catch (e) {
      setSaving(false);
    }
  };

  if (!editingDeadlines) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ width: '90%', maxWidth: '26rem', background: 'var(--color-panel)', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 20px 60px -12px rgba(0,0,0,0.35)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-text-heading)', marginBottom: '1.25rem', textAlign: 'center' }}>
          {type === 'proposal' ? '기획안 마감일 조정' : '완성본 마감일 조정'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {type === 'proposal' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-main)' }}>기획안 마감</label>
                <input
                  type="date"
                  value={editingDeadlines.proposalDeadline || ''}
                  onChange={e => setEditingDeadlines({ ...editingDeadlines, proposalDeadline: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-panel-alt)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-main)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-main)' }}>기획안 서브 타이틀</label>
                <input
                  type="text"
                  placeholder="예: 26-1분기 (5월 콘텐츠)"
                  value={editingDeadlines.proposalSubLabel || ''}
                  onChange={e => setEditingDeadlines({ ...editingDeadlines, proposalSubLabel: e.target.value, proposalTitle: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-panel-alt)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-main)', outline: 'none' }}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-main)' }}>완성본 마감</label>
                <input
                  type="date"
                  value={editingDeadlines.finalDeadline || ''}
                  onChange={e => setEditingDeadlines({ ...editingDeadlines, finalDeadline: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-panel-alt)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-main)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-main)' }}>완성본 서브 타이틀</label>
                <input
                  type="text"
                  placeholder="예: 마감일 없음"
                  value={editingDeadlines.finalSubLabel || ''}
                  onChange={e => setEditingDeadlines({ ...editingDeadlines, finalSubLabel: e.target.value, finalTitle: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-panel-alt)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-main)', outline: 'none' }}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: 'var(--color-panel-alt)', color: 'var(--color-text-muted)', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: '#002454', color: 'white', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
