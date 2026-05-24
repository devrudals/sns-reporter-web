import re

path = "src/components/ContentsLayout.tsx"

with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Replace canViewSecret
target_func = r"(const canViewSecret = \(msg: any\) => \{[\s\S]*?return isAdmin \|\|.*?;\s*\};)"

def replace_func(match):
    return """const canViewSecret = (msg: any) => {
    if (!msg.isSecret) return true;
    const authorName = selectedContent?.author_name || '';
    
    // Parse crew
    const crewStr = (() => {
      try {
        return JSON.parse(selectedContent?.content_body || '{}').crew || '';
      } catch (e) { return ''; }
    })();

    const currentUserFullName = currentUserName || '';
    const isAdmin = currentUserEmail === 'admin@ymc.com' || (currentUserEmail && currentUserEmail.includes('admin')) || isGlobalAdmin;
    const isCommentAuthor = msg.author && (msg.author === currentUserFullName || msg.author === currentUserEmail);
    
    return isAdmin || isCommentAuthor || (currentUserFullName && (authorName.includes(currentUserFullName) || crewStr.includes(currentUserFullName))) || (currentUserEmail && crewStr.includes(currentUserEmail));
  };"""

code = re.sub(target_func, replace_func, code)

# 2. Add useEffect for isSecretComment
target_state = r"(const \[isSecretComment, setIsSecretComment\] = useState\(false\);)"

def replace_state(match):
    return match.group(1) + """
  useEffect(() => {
    if (isGlobalAdmin || (currentUserEmail && currentUserEmail.includes('admin'))) {
      setIsSecretComment(true);
    }
  }, [isGlobalAdmin, currentUserEmail]);"""

if "setIsSecretComment(true);" not in code:
    code = re.sub(target_state, replace_state, code)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("Patch applied.")
