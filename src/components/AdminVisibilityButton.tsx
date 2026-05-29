'use client';

import { useState } from 'react';
import { toggleCrewVisibility } from '@/app/actions/user';
import { useRouter } from 'next/navigation';

export default function AdminVisibilityButton({ userId, isHidden }: { userId: string, isHidden: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const handleToggle = async () => {
    setLoading(true);
    const newVisibility = isHidden; // if it was hidden, we want to make it visible (true)
    const res = await toggleCrewVisibility(userId, newVisibility);
    setLoading(false);
    
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || '상태 변경 실패');
    }
  };

  const isVisible = !isHidden;

  return (
    <button 
      onClick={handleToggle}
      disabled={loading}
      style={{
        padding: '0.4rem 0.8rem',
        borderRadius: '6px',
        border: 'none',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        backgroundColor: isVisible ? '#dcfce7' : '#f3f4f6',
        color: isVisible ? '#166534' : '#4b5563',
        transition: 'all 0.2s',
        opacity: loading ? 0.7 : 1
      }}
    >
      {loading ? '...' : (isVisible ? '노출 중' : '숨김')}
    </button>
  );
}
