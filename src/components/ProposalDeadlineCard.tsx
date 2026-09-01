'use client';

import React, { useState } from 'react';
import DeadlineEditModal from '@/components/DeadlineEditModal';

// PC 대시보드의 "기획안 마감" 카드 — 예전엔 순수 표시용이었는데, 모바일
// 대시보드에 이미 있던 "클릭하면 마감일 조정 레이어가 뜨는" 동작을 그대로
// 이식했다(요청 반영: PC에서도 기획안/완성본 마감 클릭 시 설정 레이어가
// 각각 나오게). 관리자가 아니면 클릭해도 아무 반응 없다.
interface ProposalDeadlineCardProps {
  isAdmin: boolean;
  proposalLabel?: string | null;
  proposalDeadline?: string | null;
  proposalSubLabel?: string | null;
  proposalQuotaMet: boolean;
  proposalDDayLabel: string;
  myTeamQuota?: number | null;
  myProposalCount: number;
}

export default function ProposalDeadlineCard({
  isAdmin,
  proposalLabel,
  proposalDeadline,
  proposalSubLabel,
  proposalQuotaMet,
  proposalDDayLabel,
  myTeamQuota,
  myProposalCount,
}: ProposalDeadlineCardProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div
        className="motion-card proposal-card-bg"
        onClick={() => { if (isAdmin) setShowModal(true); }}
        title={isAdmin ? '클릭해서 기획안 마감일 조정' : undefined}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '24px',
          padding: '1.25rem 1.5rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 10px 24px -6px rgba(0, 0, 0, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
          cursor: isAdmin ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--color-text-heading)', fontSize: '0.82rem', fontWeight: 700 }}>
            {proposalLabel || '기획안 마감'}
          </span>
          {proposalDeadline && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>
              {proposalDeadline}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          {proposalQuotaMet ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-1px', lineHeight: '1.1' }}>
              ✅ 완료
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-heading)', fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: '1.1' }}>
              {proposalDDayLabel}
            </div>
          )}
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85, textAlign: 'right' }}>
            {proposalSubLabel || '26-1분기 (5월 콘텐츠)'}
            {typeof myTeamQuota === 'number' && myTeamQuota > 0 && (
              <><br />{myProposalCount}/{myTeamQuota}건 제출</>
            )}
          </span>
        </div>
      </div>

      {showModal && <DeadlineEditModal type="proposal" onClose={() => setShowModal(false)} />}
    </>
  );
}
