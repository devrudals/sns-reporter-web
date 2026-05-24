const fs = require('fs');

const filePath = 'src/components/ContentsLayout.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix canViewSecret
const secretCheckTarget = `  const canViewSecret = (msg: any) => {
    if (!msg.isSecret) return true;
    const authorName = selectedContent?.author_name || '';
    
    // Parse crew
    const crewStr = (() => {
      try {
        return JSON.parse(selectedContent?.content_body || '{}').crew || '';
      } catch (e) { return ''; }
    })();

    const currentUserFullName = currentUserName || '';
    const isAdmin = currentUserEmail === 'admin';
    return isAdmin || (currentUserFullName && (authorName.includes(currentUserFullName) || crewStr.includes(currentUserFullName))) || (currentUserEmail && crewStr.includes(currentUserEmail));
  };`;

const secretCheckReplace = `  const canViewSecret = (msg: any) => {
    if (!msg.isSecret) return true;
    const authorName = selectedContent?.author_name || '';
    
    // Parse crew
    const crewStr = (() => {
      try {
        return JSON.parse(selectedContent?.content_body || '{}').crew || '';
      } catch (e) { return ''; }
    })();

    const currentUserFullName = currentUserName || '';
    const isAdmin = currentUserEmail === 'admin@ymc.com' || currentUserEmail?.includes('admin') || isGlobalAdmin;
    const isCommentAuthor = msg.author && (msg.author === currentUserFullName || msg.author === currentUserEmail);
    
    return isAdmin || isCommentAuthor || (currentUserFullName && (authorName.includes(currentUserFullName) || crewStr.includes(currentUserFullName))) || (currentUserEmail && crewStr.includes(currentUserEmail));
  };`;

content = content.replace(secretCheckTarget, secretCheckReplace);

// 2. Default to true for isSecretComment if admin
const secretStateTarget = `const [isSecretComment, setIsSecretComment] = useState(false);`;
const secretStateReplace = `const [isSecretComment, setIsSecretComment] = useState(false);
  useEffect(() => {
    if (isGlobalAdmin || currentUserEmail?.includes('admin')) {
      setIsSecretComment(true);
    }
  }, [isGlobalAdmin, currentUserEmail]);`;

content = content.replace(secretStateTarget, secretStateReplace);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Secret comment logic patched.');
