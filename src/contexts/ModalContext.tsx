'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ProposalSubmitForm from '@/components/ProposalSubmitForm';
import FinalSubmitForm from '@/components/FinalSubmitForm';
import ContentsLayout from '@/components/ContentsLayout';

interface ModalContextType {
  openProposalModal: (id?: string) => void;
  openFinalWorkModal: (id?: string) => void;
  openContentModal: (id: string) => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [isProposalOpen, setIsProposalOpen] = useState(false);

  const [finalWorkId, setFinalWorkId] = useState<string | null>(null);
  const [isFinalWorkOpen, setIsFinalWorkOpen] = useState(false);

  const [contentId, setContentId] = useState<string | null>(null);
  const [isContentOpen, setIsContentOpen] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openProposalModal = (id?: string) => {
    setProposalId(id || null);
    setIsProposalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const openFinalWorkModal = (id?: string) => {
    setFinalWorkId(id || null);
    setIsFinalWorkOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const openContentModal = (id: string) => {
    setContentId(id);
    setIsContentOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeAllModals = () => {
    setIsProposalOpen(false);
    setIsFinalWorkOpen(false);
    setIsContentOpen(false);
    document.body.style.overflow = 'unset';
  };

  const ModalOverlay = ({ children, onClose }: { children: ReactNode, onClose: () => void }) => {
    if (!mounted) return null;
    return createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ width: '100%', maxWidth: '800px', margin: 'auto', position: 'relative', animation: 'scaleIn 0.2s ease-out' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
          {children}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <ModalContext.Provider value={{ openProposalModal, openFinalWorkModal, openContentModal, closeAllModals }}>
      {children}

      {isProposalOpen && (
        <ModalOverlay onClose={() => window.dispatchEvent(new Event('request-modal-close'))}>
          <ProposalSubmitForm 
            embeddedId={proposalId || undefined} 
            isModal={true}
            onCancel={closeAllModals} 
            onSuccess={() => { closeAllModals(); window.location.reload(); }} 
          />
        </ModalOverlay>
      )}

      {isFinalWorkOpen && (
        <ModalOverlay onClose={() => window.dispatchEvent(new Event('request-modal-close'))}>
          <FinalSubmitForm 
            embeddedId={finalWorkId || undefined} 
            onCancel={closeAllModals} 
            onSuccess={() => { closeAllModals(); window.location.reload(); }} 
          />
        </ModalOverlay>
      )}

      {isContentOpen && contentId && (
        <ContentsLayout
          modalOnly={true}
          openModalId={Number(contentId)}
          onModalClose={closeAllModals}
        />
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
