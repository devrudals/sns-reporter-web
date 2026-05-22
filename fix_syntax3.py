filepath = 'src/components/ContentsLayout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Revert global opacity changes
content = content.replace("            opacity: (!canViewSecret(msg) && msg.isSecret) ? 0.6 : 1,", "")
content = content.replace("            opacity: (!canViewSecret(msg) && msg.isSecret) ? 0.6 : 1\n", "")

# 2. Add opacity specifically to comments.
# Comments are rendered inside `comments.map((msg, idx) => (`
# Let's use a regex to specifically target the `backgroundColor: '#ffffff'` inside the comment rendering logic.
# Wait, let's just not add the opacity to the comment box, or let's use replace_file_content carefully.
# For now, just removing the invalid opacity logic fixes the `msg` not defined error.

# Wait, what about the `) : (` mismatch?
# At line 1675:
#                             </div>
#                           </div>
# 
#                             )
# 
#                           ) : (
# 
#                             /* 기획안 폼 모드 - 좌측 화면 */

# Why did patch_inline_edit.py generate this?
# Because `close_replacement` was `\1</div>\n\1  )\n\1) : (\n\1  /* 기획안`
# But it matched the `</div>` BEFORE `) : (`.
# Let's fix lines 1675-1678 manually in python.
lines = content.split('\n')
for i in range(1660, 1690):
    if ") : (" in lines[i] and "/*" in lines[i+2]:
        if ")" in lines[i-2]:
            lines[i-2] = "                          )"
            lines[i] = "                        ) : ("

# Let's do a reliable string replace for that exact block.
bad_block = """                            </div>
                          </div>

                            )

                          ) : (

                            /* 기획안"""

good_block = """                            </div>
                          </div>
                        )
                      ) : (
                            /* 기획안"""

content = '\n'.join(lines)
content = content.replace(bad_block, good_block)

# Also fix line 2013: `)} // End of isFinalWorkView` or something?
bad_block2 = """                      </div>
                    )
                  ) : ("""
# wait, what's at 2013?
# The `Select-String` didn't show it clearly. Let's just fix it if we can find it.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed")
