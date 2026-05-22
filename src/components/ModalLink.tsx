'use client';

import React from 'react';
import { useModal } from '@/contexts/ModalContext';

interface ModalLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children: React.ReactNode;
}

export default function ModalLink({ href, children, className, style, onClick, ...rest }: ModalLinkProps) {
  const { openProposalModal, openFinalWorkModal, openContentModal } = useModal();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (onClick) {
      onClick(e);
    }

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
      {...rest}
    >
      {children}
    </a>
  );
}
