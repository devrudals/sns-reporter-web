const fs = require('fs');

const original = fs.readFileSync('src/components/ContentsLayout.tsx', 'utf8');

// We will find the entire '{/* 4. Fullscreen Split Popup Modal */}' block.
const modalStart = original.indexOf('{/* 4. Fullscreen Split Popup Modal */}');
const modalEndString = '</div>\n    </div>\n  );\n}';
const modalEnd = original.lastIndexOf(modalEndString);

let modalJSX = original.substring(modalStart, modalEnd);
// Adjust modal JSX to be a valid return for a component
modalJSX = modalJSX.replace('{isModalOpen && (', 'return isOpen && typeof document !== "undefined" ? createPortal(');
const lastBrace = modalJSX.lastIndexOf(')}');
modalJSX = modalJSX.substring(0, lastBrace) + ', document.body) : null;';
modalJSX = modalJSX.replace(/setIsModalOpen\(false\)/g, 'onClose()');

// Extract all state and handlers before the return statement.
// We need to keep: isFinalWorkView, tempFormData, comments stuff, helper functions.
const returnStart = original.indexOf('return (\n    <div className="contents-layout-container"');
let stateLogic = original.substring(original.indexOf('  // Modal states'), returnStart);

// Remove setContentsList calls and replace with onContentUpdated
stateLogic = stateLogic.replace(/setContentsList[\s\S]*?;/g, 'onContentUpdated(updatedItem);');
stateLogic = stateLogic.replace('const [isFinalWorkView, setIsFinalWorkView] = useState(false);', 
  'const [isFinalWorkView, setIsFinalWorkView] = useState(defaultIsFinalWorkView);');

// Fix isEditable to not rely on currentUserEmail from outer scope directly if it's missing, but we will pass it as prop.
// We need a helper for canViewSecret
const secretHelper = `
  const [isSecretComment, setIsSecretComment] = useState(false);
  const canViewSecret = (msg: any) => {
     if (!msg.isSecret) return true;
     if (!currentUserEmail) return false;
     if (currentUserEmail === 'admin@ymc.com' || currentUserEmail.includes('admin')) return true;
     const myName = currentUserName || currentUserEmail.split('@')[0];
     if (msg.author === myName) return true;
     if (!selectedContent) return false;
     let emailInJson = '';
     try { emailInJson = JSON.parse(selectedContent.content_body || '{}').authorEmail; } catch (e) {}
     if (emailInJson === currentUserEmail || selectedContent.author_name === currentUserEmail || selectedContent.author_name.includes(myName)) return true;
     let crewStr = '';
     try { crewStr = JSON.parse(selectedContent.content_body || '{}').crew || ''; } catch (e) {}
     if (crewStr && crewStr.includes(myName)) return true;
     return false;
  };
`;

// Insert secretHelper before `const handleAddComment`
stateLogic = stateLogic.replace('const handleAddComment =', secretHelper + '\n  const handleAddComment =');

// Update handleAddComment for isSecret
stateLogic = stateLogic.replace('attachments: messageAttachment\n      };', 'attachments: messageAttachment,\n        isSecret: isSecretComment\n      };');

// Masking logic in renderCommentNode
stateLogic = stateLogic.replace(/dangerouslySetInnerHTML=\{\{ __html: parseCommentMarkdown\(msg\.text\) \}\}/g, 
  `dangerouslySetInnerHTML={{ __html: canViewSecret(msg) ? parseCommentMarkdown(msg.text) : '비밀댓글입니다. 🔒' }}`);
stateLogic = stateLogic.replace(/\(msg\.attachments \?\? \[\]\)\.map/g, 
  `(canViewSecret(msg) ? (msg.attachments ?? []) : []).map`);
stateLogic = stateLogic.replace(/opacity: 1/g, `opacity: (!canViewSecret(msg) && msg.isSecret) ? 0.6 : 1`);

// Secret Comment Checkbox in UI
modalJSX = modalJSX.replace(/<button \n?\s*onClick=\{handleAddComment\}/g,
  `
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' }}>
    <input type="checkbox" id="secretComment" checked={isSecretComment} onChange={e => setIsSecretComment(e.target.checked)} />
    <label htmlFor="secretComment" style={{ fontSize: '0.8rem', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>비밀댓글로 남기기</label>
  </div>
  <button 
    onClick={() => handleAddComment(null, '', false)}`
);

// Reply button onClick fix
modalJSX = modalJSX.replace(/handleAddComment\(msg\.id, replyComment, true\)/g, 'handleAddComment(msg.id, replyComment, true)');

// We need the helpers at the top
const helpersStart = original.indexOf('// Helper to parse simple markdown');
const helpersEnd = original.indexOf('type ContentItem =');
const helpers = original.substring(helpersStart, helpersEnd);

// isEditable logic (it was defined in the component)
const isEditableLogic = `
  const isEditable = useMemo(() => {
    if (!selectedContent) return false;
    let emailInJson = '';
    try { emailInJson = JSON.parse(selectedContent.content_body || '{}').authorEmail; } catch (e) {}
    return currentUserEmail === 'admin@ymc.com' || (currentUserEmail && currentUserEmail.includes('admin')) || 
           (currentUserEmail && (emailInJson === currentUserEmail || selectedContent.author_name === currentUserEmail));
  }, [selectedContent, currentUserEmail]);
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\\./g, '').replace(/ /g, '-');
  };
`;

const fileContents = `'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import RichTextEditor from '@/components/RichTextEditor';
import { createPortal } from 'react-dom';

${helpers}

export interface ContentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContent: any;
  setSelectedContent: (content: any) => void;
  currentUserEmail: string | null;
  currentUserName: string | null;
  allProfiles: any[];
  onContentUpdated: (updatedContent: any) => void;
  defaultIsFinalWorkView?: boolean;
}

export default function ContentDetailModal({
  isOpen,
  onClose,
  selectedContent,
  setSelectedContent,
  currentUserEmail,
  currentUserName,
  allProfiles,
  onContentUpdated,
  defaultIsFinalWorkView = false
}: ContentDetailModalProps) {
  const supabase = createClient();
  
  ${isEditableLogic}
  
  ${stateLogic}
  
  ${modalJSX}
}
`;

fs.writeFileSync('src/components/ContentDetailModal.tsx', fileContents);
console.log('Done building clean ContentDetailModal');
