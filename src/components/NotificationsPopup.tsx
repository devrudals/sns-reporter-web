'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useRealtimeNotification } from '@/contexts/RealtimeNotificationContext';
import { useModalA11y } from '@/hooks/useModalA11y';

export default function NotificationsPopup({ userEmail, userName }: { userEmail: string | null, userName: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { unreadCount, markAllRead } = useRealtimeNotification();
  const supabase = createClient();
  const panelRef = useRef<HTMLDivElement>(null);
  useModalA11y(panelRef, isOpen, () => setIsOpen(false));

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?t=${new Date().getTime()}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
      markAllRead();
    }
  }, [isOpen, fetchFeedbacks, markAllRead]);

  // 최초 로드 시 알림 개수 미리 조회
  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: '#64748b', display: 'flex' }}
        title="알림"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-6px',
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            borderRadius: '9999px',
            border: '2px solid #f1f5f9',
            fontSize: '9px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
          <div
            ref={panelRef}
            tabIndex={-1}
            className="animate-in fade-in zoom-in-95 duration-150 ease-out"
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px',
              backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid #e2e8f0', zIndex: 50, overflow: 'hidden', display: 'flex', flexDirection: 'column',
              transformOrigin: 'top right'
            }}
          >
            <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: '#1e293b' }}>
              최근 피드백 알림
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>불러오는 중...</div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>새로운 피드백이 없습니다.</div>
              ) : (
                notifications.map(noti => (
                  <Link 
                    key={noti.id} 
                    href={`/${noti.status?.includes('final') ? 'final-works' : 'proposals'}/submit?id=${noti.id}`}
                    onClick={() => setIsOpen(false)}
                    style={{ 
                      display: 'block', padding: '1rem', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>{noti.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4, backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '6px' }}>
                      💬 {noti.feedback_comment || '상태가 변경되었습니다. 확인해주세요.'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'right' }}>
                      {new Date(noti.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
