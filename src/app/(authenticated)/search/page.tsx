import { createClient } from "@/utils/supabase/server";
import ContentsLayout from "@/components/ContentsLayout";
type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SearchResultsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = typeof resolvedParams?.q === 'string' ? resolvedParams.q : '';

  const supabase = await createClient();

  // [P-G] select('*') 대신 필요한 컬럼만 명시 (content_body 제외) + range 추가
  const { data: contents } = await supabase
    .from('contents')
    .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('title', 'SYSTEM_DEADLINES')
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .range(0, 99);

  let results = contents || [];

  if (query) {
    const qLower = query.toLowerCase();
    results = results.filter(item => 
      item.title?.toLowerCase().includes(qLower) ||
      item.author_name?.toLowerCase().includes(qLower) ||
      item.team?.toLowerCase().includes(qLower) ||
      item.content_type?.toLowerCase().includes(qLower) ||
      item.feedback_comment?.toLowerCase().includes(qLower)
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserEmail = user?.email || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>
          "{query}" 검색 결과 <span style={{ color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>({results.length}건)</span>
        </h2>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {results.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            검색 결과가 없습니다.
          </div>
        ) : (
          <ContentsLayout 
            initialContents={results} 
            searchQuery={query}
            currentUserEmail={currentUserEmail}
          />
        )}
      </div>
    </div>
  );
}
