import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function GET() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch dbProfiles to get the actual names set in profile
  const { data: dbProfiles } = await supabaseAdmin.from('contents').select('description, author_name, team').eq('content_type', 'SYSTEM_PROFILE');
  const profileMap = new Map();
  (dbProfiles || []).forEach(p => {
    if (p.description) profileMap.set(p.description, { name: p.author_name, team: p.team });
  });

  const crewList = (users || [])
    .filter(u => u.user_metadata?.is_hidden_in_crew !== true)
    .map(u => {
      const dbP = profileMap.get(u.email);
      const name = dbP?.name || u.user_metadata?.full_name || u.user_metadata?.name || u.email;
      const team = dbP?.team || u.user_metadata?.team || '팀 미지정';
      return {
        id: u.id,
        email: u.email,
        name: name,
        team: team
      };
    })
    // Sort by name alphabetically
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(crewList);
}
