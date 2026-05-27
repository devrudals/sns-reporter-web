import { createClient } from "@/utils/supabase/server";
import ContentsLayout from "@/components/ContentsLayout";

async function ContentsPageContent({ searchParams }: { searchParams: { openModalId?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email || null;
  
  let realName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
  if (userEmail) {
    const { data: profile } = await supabase.from('contents').select('author_name').eq('title', `PROFILE_${userEmail}`).single();
    if (profile?.author_name) {
      realName = profile.author_name;
    }
  }

  // Fetch all contents except system profiles
  const { data: dbContents } = await supabase
    .from('contents')
    .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment, content_body')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('title', 'SYSTEM_DEADLINES')
    .neq('content_type', 'NOTICE')
    .neq('status', 'draft') // optionally hide drafts, or we can keep them for 'mine'
    .order('created_at', { ascending: false });
  const contents = (dbContents || []) as any[];
  // Process contents
  const processedContents = (contents || []).map(item => {
    let emailInJson = '';
    let crewString = '';
    let bodyObj: any = {};
    try {
      if (item.content_body && item.content_body.startsWith('{')) {
        bodyObj = JSON.parse(item.content_body);
        emailInJson = bodyObj.authorEmail || '';
        if (typeof bodyObj.crew === 'string') {
          crewString = bodyObj.crew;
        } else if (Array.isArray(bodyObj.crew)) {
          crewString = bodyObj.crew.map((c: any) => c.name || '').join(',');
        }
      }
    } catch(e) {}

    const isAuthor = user && (emailInJson === userEmail || item.author_name === userEmail || 
                           item.author_name === realName ||
                           (realName && item.author_name?.includes(realName)));
    const isCrew = user && realName && crewString.includes(realName);
    const isMine = !!(isAuthor || isCrew);
    
    return { 
      ...item, 
      isMine, 
      isAuthor, 
      isCrew: !!isCrew, 
      parsedCrew: crewString, 
      articleType: bodyObj.articleType || '',
      docsUrl: bodyObj.docsUrl || '',
      targetMonth: bodyObj.targetMonth || '',
      finalSubmittedAt: bodyObj.finalSubmittedAt || '',
    };
  });

  return (
    <ContentsLayout 
      initialContents={processedContents} 
      currentUserEmail={userEmail} 
      currentUserName={realName} 
      openModalId={searchParams.openModalId ? parseInt(searchParams.openModalId, 10) : undefined}
    />
  );
}

import { Suspense } from 'react';
import Loading from '../loading';

export default function ContentsPage({ searchParams }: any) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
