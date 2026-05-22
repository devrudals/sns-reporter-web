const fs = require('fs');
let code = fs.readFileSync('src/components/OtherProposalsCarousel.tsx', 'utf8');

const oldModalRegex = /\{\s*showModalForId\s*&&\s*rawProposal\s*&&\s*mounted\s*&&\s*createPortal\([\s\S]*?\}\s*<\/style>\s*<\/div>\s*\)\;/;

const newModalCode = `{showModalForId && (
        <ContentsLayout 
          initialContents={dbProposals as any}
          currentUserEmail={currentUserInfo?.email || null}
          currentUserName={currentUserInfo?.name || null}
          openModalId={typeof showModalForId === 'string' ? parseInt(showModalForId, 10) : showModalForId as any}
          modalOnly={true}
          onModalClose={() => setShowModalForId(null)}
        />
      )}
    </div>
  );`;

code = code.replace(oldModalRegex, newModalCode);

fs.writeFileSync('src/components/OtherProposalsCarousel.tsx', code);
console.log('Patched OtherProposalsCarousel.tsx');
