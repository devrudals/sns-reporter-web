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
    .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('content_type', 'NOTICE')
    .neq('status', 'draft') // optionally hide drafts, or we can keep them for 'mine'
    .order('created_at', { ascending: false });
  const contents = (dbContents || []) as any[];
  // Process contents - lightweight, no content_body parsing
  const processedContents = (contents || []).map(item => {
    const isAuthor = user && (item.author_name === userEmail || 
                           item.author_name === realName ||
                           (realName && item.author_name?.includes(realName)));
    const isMine = !!isAuthor;
    
    return { 
      ...item, 
      isMine, 
      isAuthor, 
      isCrew: false, 
      parsedCrew: '', 
      articleType: '',
      docsUrl: '',
      targetMonth: '',
      finalSubmittedAt: '',
      content_body: '{}'
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
