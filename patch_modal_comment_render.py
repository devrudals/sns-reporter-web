import re

path = "src/components/ContentsLayout.tsx"

with open(path, "r", encoding="utf-8") as f:
    code = f.read()

target1 = r"(dangerouslySetInnerHTML=\{\{\s*__html:\s*)parseCommentMarkdown\(comment\.text\)(\s*\}\})"
replace1 = r"\1canViewSecret(comment) ? parseCommentMarkdown(comment.text) : '🔒 비밀댓글입니다.'\2"

target2 = r"(\{comment\.attachments && comment\.attachments\.map\(\(attach: any, idx: number\) => \()"
replace2 = r"{canViewSecret(comment) && comment.attachments && comment.attachments.map((attach: any, idx: number) => ("

code = re.sub(target1, replace1, code)
code = re.sub(target2, replace2, code)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("Modal comment render patched.")
