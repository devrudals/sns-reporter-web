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

  // [P-G] select('*') 대신 필요한 컬럼만 명시하여 content_body(base64 이미지 포함 가능) 제외
  const { data: contents } = await supabase
    .from('contents')
    .select('id, title, author_name, team, content_type, status, created_at, final_url, target_date, description, keywords, intent, feedback_comment')
    .neq('content_type', 'SYSTEM_PROFILE')
    .neq('title', 'SYSTEM_DEADLINES')
    .neq('content_type', 'NOTICE')
    .order('created_at', { ascending: false })
    .range(0, 99);

  // Fetch all profiles for generation (기수) display
  const { data: profiles } = await supabase
    .from('contents')
    .select('title, author_name, keywords, team')
    .like('title', 'PROFILE_%');

  return (
    <div style={{ padding: '0', maxWidth: '1400px', margin: '0 auto' }}>
      <AdminBoardClient contents={contents || []} allProfiles={profiles || []} />
    </div>
  );
}
