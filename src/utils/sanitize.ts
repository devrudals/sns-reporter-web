import DOMPurify from 'dompurify';

/**
 * XSS 방어를 위한 HTML 살균(Sanitize) 함수
 * @param dirty 위험할 수 있는 원본 HTML 문자열
 * @returns 안전하게 정제된 HTML 문자열
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  if (typeof window === 'undefined') {
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/javascript:[^"']*/g, '');
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'div', 'br', 'span', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'del', 's', 'u', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'src', 'alt', 'title'],
    ADD_ATTR: ['target', 'rel'],
  });
}

/**
 * 노션, 워드, 한글, 웹페이지 등에서 복사된 HTML의
 * 불필요한 외계 폰트(font-family), 고정 폰트 크기(font-size), 고정 색상(color, background-color)을 제거하여
 * 시스템 표준 서식으로 정규화하는 함수
 */
export function normalizeHtmlStyles(html: string): string {
  if (!html) return '';

  return html
    .replace(/font-family\s*:\s*[^;"]+;?/gi, '')
    .replace(/font-size\s*:\s*[^;"]+;?/gi, '')
    .replace(/background(-color)?\s*:\s*[^;"]+;?/gi, '')
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/style\s*=\s*["']\s*["']/gi, '');
}
