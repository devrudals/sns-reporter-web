import { createClient } from "@/utils/supabase/server";
import AdminBoardClient from "@/components/AdminBoardClient";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AdminContentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const isAdminUser = user.email === 'admin@admin.com' || user.user_metadata?.is_admin === true;
  if (!isAdminUser) {
    redirect('/dashboard');
  }

  // [성능 최적화] Promise.all로 콘텐츠와 프로필 데이터를 병렬 페칭
  const [{ data: contents }, { data: profiles }] = await Promise.all([
    supabase
      .from('contents')
      .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment')
      .neq('content_type', 'SYSTEM_PROFILE')
      .neq('title', 'SYSTEM_DEADLINES')
      .neq('content_type', 'NOTICE')
      .order('created_at', { ascending: false })
      .range(0, 99),
    supabase
      .from('contents')
      .select('title, author_name, keywords, team')
      .like('title', 'PROFILE_%')
  ]);

  return (
    <div style={{ padding: '0', maxWidth: '1400px', margin: '0 auto' }}>
      <AdminBoardClient contents={contents || []} allProfiles={profiles || []} />
    </div>
  );
}
