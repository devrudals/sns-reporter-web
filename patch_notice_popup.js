const fs = require('fs');
let code = fs.readFileSync('src/components/NoticeList.tsx', 'utf8');

// Update NoticeItem interface
code = code.replace(
  'isImportant: boolean;\n}',
  'isImportant: boolean;\n  content_body?: string;\n}'
);

// Add content_body mapping
code = code.replace(
  'category: n.category || \'공지사항\',',
  'category: n.team || n.author_name || \'공지사항\',\n        content_body: n.content_body,'
);

code = code.replace(
  'isImportant: !!n.is_important',
  'isImportant: n.status === \'IMPORTANT\''
);

// Add state for selected notice
code = code.replace(
  'const [readIds, setReadIds] = useState<string[]>([]);',
  'const [readIds, setReadIds] = useState<string[]>([]);\n  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);'
);

// Update link to open modal instead of routing
code = code.replace(
  /<Link \n\s*key={notice\.id} \n\s*href={`\/notices\?id=\${notice\.id}`}/g,
  '<div \n              key={notice.id} \n              style={{ cursor: \'pointer\' }} \n              onClick={() => { markAsRead(notice.id); setSelectedNotice(notice); }}'
);
code = code.replace(
  /<\/Link>/g,
  '</div>'
);
code = code.replace(
  'onClick={() => markAsRead(notice.id)}',
  ''
);

// Add Modal render at the end
const modalCode = `
      {selectedNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedNotice(null)}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '600px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                  {selectedNotice.category}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>{selectedNotice.title}</h2>
              </div>
              <button onClick={() => setSelectedNotice(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>작성일: {selectedNotice.date}</span>
            </div>
            <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto' }}>
              {selectedNotice.content_body || '내용이 없습니다.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

code = code.replace('    </div>\n  );\n}', modalCode);

fs.writeFileSync('src/components/NoticeList.tsx', code);
console.log('NoticeList.tsx patched');
