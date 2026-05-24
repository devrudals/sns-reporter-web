import re
files = ['src/components/ProposalSubmitForm.tsx', 'src/components/FinalSubmitForm.tsx']
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    content = re.sub(r"router\.push\('/final-works'\)", "router.push('/contents')", content)
    content = re.sub(r"router\.push\('/proposals'\)", "router.push('/contents')", content)
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print('Patched routing')
