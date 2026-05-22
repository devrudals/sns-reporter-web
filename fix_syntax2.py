filepath = 'src/components/ContentsLayout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "isEditingFinalWork ?" in line:
        pass

# The error is at line 1677:
#                           </div>
# 
#                             )
# 
#                           ) : (
# 
#                             /* 기획안 작성 모드 - 좌측 화면 */

# Let's find the `) : (` block that comes after the FinalSubmitForm.
for i in range(1660, 1690):
    if ") : (" in lines[i] and ")" in lines[i-2]:
        lines[i] = "                          ) : (\n"
        lines[i-2] = "                          )\n"

# The error at 2013:
for i in range(2000, 2030):
    if ")} // End of isFinalWorkView" in lines[i] or "}" in lines[i] and "</div>" in lines[i-1]:
        pass

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
