import re

filepath = 'src/components/ProposalSubmitForm.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to remove the broken syntax at the end
# It looks like:
# }
# 
# >
#             <ProposalSubmitForm />
#         </Suspense>
#     );
# }

content = re.sub(r">\s*<ProposalSubmitForm />\s*</Suspense>\s*\);\s*\}", "", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed syntax")
