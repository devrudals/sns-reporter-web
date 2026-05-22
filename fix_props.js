const fs = require('fs');
let code = fs.readFileSync('src/components/ContentsLayout.tsx', 'utf8');

const oldProps = /export default function ContentsLayout\(\{[\s\S]*?\}\) \{/;
const newProps = `export default function ContentsLayout({ 
  initialContents, 
  currentUserEmail, 
  currentUserName,
  openModalId,
  modalOnly = false,
  onModalClose
}: { 
  initialContents: ContentItem[], 
  currentUserEmail: string | null,
  currentUserName: string | null,
  openModalId?: number,
  modalOnly?: boolean,
  onModalClose?: () => void
}) {`;

code = code.replace(oldProps, newProps);

fs.writeFileSync('src/components/ContentsLayout.tsx', code);
console.log('Fixed props');
