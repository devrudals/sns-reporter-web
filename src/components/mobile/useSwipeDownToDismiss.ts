'use client';

import { useRef, useState } from 'react';

// Figma's peek↔full 전환처럼, 전체화면 모달을 아래로 스와이프하면 종이를 다시
// 내려놓듯 닫히는 제스처. 핸들 엘리먼트에 handlers를 스프레드하면 되고, 루트
// 컨테이너는 rootStyle을 그대로 style prop에 넣으면 드래그를 따라 움직인다.
export function useSwipeDownToDismiss(onClose: () => void, dismissThreshold = 120) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientY - startY.current;
    setDragY(Math.max(0, delta));
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > dismissThreshold) {
      onClose();
    }
    setDragY(0);
  };

  return {
    dragY,
    isDragging,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      style: { touchAction: 'none' as const },
    },
    rootStyle: {
      transform: dragY ? `translateY(${dragY}px)` : undefined,
      transition: isDragging ? 'none' : 'transform 0.25s ease-out',
    },
  };
}
