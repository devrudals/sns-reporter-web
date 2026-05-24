const fs = require('fs');
let code = fs.readFileSync('src/components/ContentsLayout.tsx', 'utf8');

// Add state
if (!code.includes('const [isEditingProposal')) {
  code = code.replace(
    'const [isSavingProposal, setIsSavingProposal] = useState(false);',
    'const [isSavingProposal, setIsSavingProposal] = useState(false);\n  const [isEditingProposal, setIsEditingProposal] = useState(false);'
  );
}

// Reset isEditingProposal when modal opens or closes
code = code.replace(
  'setIsFinalWorkView(false);',
  'setIsFinalWorkView(false);\n    setIsEditingProposal(false);'
);

const proposalStart = code.indexOf('/* 기획안 폼 모드 - 좌측 화면 */');
const proposalEnd = code.indexOf('/* Modal Right Panel:');

if (proposalStart !== -1 && proposalEnd !== -1) {
  let proposalSection = code.substring(proposalStart, proposalEnd);
  
  // Replace disabled={true} with disabled={!isEditingProposal}
  proposalSection = proposalSection.replace(/disabled=\{true\}/g, 'disabled={!isEditingProposal}');
  
  // Replace the buttons
  const oldButtonsRegex = /<button[^>]*onClick=\{.*?router\.push\(\`\/proposals\/submit\?id=\$\{selectedContent\.id\}\`\)[^>]*>[\s\S]*?기획안 폼에서 수정하기\s*<\/button>/;
  
  const newButtons = `<button 
                                  onClick={() => setIsEditingProposal(true)}
                                  style={{ flex: 1, padding: '0.9rem', borderRadius: '10px', border: 'none', backgroundColor: '#1E3A8A', color: '#ffffff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                  이 화면에서 바로 수정하기
                                </button>
                              )}
                              {isEditable && isEditingProposal && (
                                <button 
                                  onClick={(e) => {
                                    handleSaveProposal(e as any).then(() => {
                                      setIsEditingProposal(false);
                                    });
                                  }}
                                  disabled={isSavingProposal}
                                  style={{ flex: 1, padding: '0.9rem', borderRadius: '10px', border: 'none', backgroundColor: '#10B981', color: '#ffffff', fontWeight: 800, fontSize: '1rem', cursor: isSavingProposal ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: isSavingProposal ? 0.7 : 1 }}
                                >
                                  {isSavingProposal ? '저장 중...' : '저장하기'}
                                </button>`;
                              
  proposalSection = proposalSection.replace(oldButtonsRegex, newButtons);

  // Instead of replacing readOnly with readOnly={!isEditingProposal}, we add an empty onChange to avoid React warnings.
  proposalSection = proposalSection.replace(/readOnly\s*\n/g, "readOnly onChange={() => {}}\n");

  code = code.substring(0, proposalStart) + proposalSection + code.substring(proposalEnd);
} else {
  console.log("Could not find proposal section.");
}

fs.writeFileSync('src/components/ContentsLayout.tsx', code);
console.log("Patch applied!");
