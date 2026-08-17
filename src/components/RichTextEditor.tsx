'use client';

import React, { useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, disabled, minHeight = '150px' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML);
  };

  // 이미지를 그대로 붙여넣으면 브라우저가 base64 <img>로 인라인 삽입하는데, 원본
  // 용량이 크면(특히 휴대폰 사진·스크린샷 원본) 그 필드가 속한 콘텐츠 행의
  // content_body가 통째로 비대해진다 — 실제로 이 경로로 붙여넣은 이미지 때문에
  // 모바일 목록·캘린더 조회가 전부 느려진 사고가 있었다(docs/MOBILE_FIGMA_AUDIT.md
  // 콘텐츠 124번 기록 참고). 원본 파일 용량으로 미리 걸러 큰 이미지는 막고, 작은
  // 이미지(아이콘 등)는 그대로 허용한다.
  const MAX_PASTED_IMAGE_BYTES = 150 * 1024; // base64로 인코딩되면 약 33% 더 커진다

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items || []);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file && file.size > MAX_PASTED_IMAGE_BYTES) {
        e.preventDefault();
        alert(`붙여넣은 이미지 용량이 너무 큽니다 (${(file.size / 1024).toFixed(0)}KB). 이미지를 본문에 직접 붙여넣으면 전체 목록 로딩이 느려질 수 있어요 — 이미지 용량을 줄이거나 링크로 첨부해주세요.`);
      }
      return;
    }

    // 텍스트를 붙여넣었을 때 URL 형식이면 자동으로 <a> 태그로 변환
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      const urlRegex = /^(https?:\/\/[^\s]+)$/;
      if (urlRegex.test(text.trim())) {
        e.preventDefault();
        const url = text.trim();
        document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" style="color: #3b82f6; text-decoration: underline;">${url}</a> `);
      }
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="rich-editor-content"
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        style={{
          minHeight,
          backgroundColor: disabled ? '#f1f5f9' : '#f8fafc',
          border: 'none',
          borderRadius: '8px',
          padding: '1rem',
          outline: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: '#334155',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          overflowY: 'auto',
          maxHeight: '600px',
        }}
      />
      {!value && placeholder && !disabled && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          color: '#94a3b8',
          pointerEvents: 'none',
          fontSize: '0.95rem'
        }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}
