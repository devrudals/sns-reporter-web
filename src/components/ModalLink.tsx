'use client';

import React from 'react';
import { useModal } from '@/contexts/ModalContext';

interface ModalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function ModalLink({ href, children, className, style }: ModalLinkProps) {
  const { openProposalModal, openFinalWorkModal, openContentModal } = useModal();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (href.startsWith('/proposals/submit')) {
      const match = href.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      openProposalModal(match ? match[1] : undefined);
    } else if (href.startsWith('/final-works/submit')) {
      const match = href.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      openFinalWorkModal(match ? match[1] : undefined);
    } else if (href.startsWith('/contents') && href.includes('openModalId=')) {
      const match = href.match(/[?&]openModalId=([a-zA-Z0-9_-]+)/);
      if (match) openContentModal(match[1]);
    } else {
      // Fallback behavior if needed
      window.location.href = href;
    }
  };

  return (
    <a 
      href={href} 
      onClick={handleClick} 
      className={className} 
      style={{ cursor: 'pointer', textDecoration: 'none', ...style }}
    >
      {children}
    </a>
  );
}
