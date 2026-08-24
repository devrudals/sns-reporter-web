import React from 'react';

export default function UserAvatar({ rawName, email, avatarUrl, size = 38, className = '' }: { rawName?: string | null; email?: string | null; avatarUrl?: string | null; size?: number; className?: string }) {
  const isAdmin = email === 'admin@admin.com' || rawName === '관리자' || rawName?.toLowerCase().includes('admin');
  
  const getInitials = () => {
    if (isAdmin) return (
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    ); // Admin Shield icon
    if (!rawName) return '👤';
    const match = rawName.match(/(\d+기)/);
    if (match) return match[1];
    return rawName.replace(/[^가-힣a-zA-Z0-9]/g, '').slice(0, 2) || '👤';
  };

  if (avatarUrl) {
    return (
      <img 
        src={avatarUrl} 
        alt="Profile" 
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
        className={className}
      />
    );
  }

  return (
    <div 
      className={`user-avatar ${className}`}
      style={{ 
        width: size, 
        height: size, 
        borderRadius: '50%', 
        backgroundColor: '#002454', 
        color: '#ffffff', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: size * 0.35, 
        fontWeight: 900,
        flexShrink: 0,
        letterSpacing: '-0.02em'
      }}
    >
      {getInitials()}
    </div>
  );
}
