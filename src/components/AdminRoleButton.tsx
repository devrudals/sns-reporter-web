'use client';

import { useState } from 'react';
import { setAdminRole } from '@/app/actions/user';
import { useRouter } from 'next/navigation';

export default function AdminRoleButton({ userId, isCurrentlyAdmin, isMaster }: { userId: string, isCurrentlyAdmin: boolean, isMaster: boolean }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const toggleRole = async () => {
    if (isMaster) {
      alert('마스터 관리자는 권한을 변경할 수 없습니다.');
      return;
    }
    const confirmMessage = isCurrentlyAdmin 
      ? '이 유저의 관리자 권한을 해제하시겠습니까?' 
      : '이 유저에게 관리자 권한을 부여하시겠습니까?';
      
    if (!confirm(confirmMessage)) return;

    setIsLoading(true);
    const { success, error } = await setAdminRole(userId, !isCurrentlyAdmin);
    setIsLoading(false);

    if (success) {
      alert('권한이 성공적으로 변경되었습니다.');
      router.refresh();
    } else {
      alert(`오류가 발생했습니다: ${error}`);
    }
  };

  if (isMaster) {
    return (
      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'inline-block' }}>
        마스터
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {isCurrentlyAdmin && (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534', display: 'inline-block' }}>
          관리자
        </span>
      )}
      <button 
        onClick={toggleRole} 
        disabled={isLoading}
        style={{
          padding: '4px 8px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: isCurrentlyAdmin ? '#fee2e2' : '#f1f5f9',
          color: isCurrentlyAdmin ? '#b91c1c' : '#475569',
          border: '1px solid ' + (isCurrentlyAdmin ? '#fecaca' : '#cbd5e1'),
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? '...' : (isCurrentlyAdmin ? '권한 해제' : '관리자 지정')}
      </button>
    </div>
  );
}
