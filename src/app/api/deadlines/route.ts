import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

const SYSTEM_TITLE = 'SYSTEM_DEADLINES';

export async function GET() {
  // Use admin client to bypass RLS for system records
  const { data, error } = await supabaseAdmin
    .from('contents')
    .select('content_body')
    .eq('title', SYSTEM_TITLE)
    .single();

  if (error || !data?.content_body) {
    return NextResponse.json({ proposalDeadline: null, finalDeadline: null, proposalLabel: null, finalLabel: null });
  }
  try {
    return NextResponse.json(JSON.parse(data.content_body));
  } catch {
    return NextResponse.json({ proposalDeadline: null, finalDeadline: null, proposalLabel: null, finalLabel: null });
  }
}

export async function POST(req: NextRequest) {
  // [B10] 로그인 여부 + admin 여부 모두 검증
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isAdmin =
    user.user_metadata?.is_admin === true ||
    user.email === 'admin@admin.com';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Use admin client to bypass RLS for writing system records
  const { data: existing } = await supabaseAdmin
    .from('contents')
    .select('id, content_body')
    .eq('title', SYSTEM_TITLE)
    .maybeSingle();

  // 마감 설정은 여러 화면(관리자 설정 페이지, PC 마감 수정 모달, 모바일 마감
  // 수정 모달)이 같은 레코드 하나를 쓴다. 예전에는 보낸 JSON으로 레코드를
  // 통째로 갈아치웠기 때문에, 한 화면에서 저장하면 그 화면이 다루지 않는
  // 필드가 조용히 사라졌다. 그래서 관리자 설정에서 부제목을 바꾸면
  // proposalTitle이 지워져 모바일 대시보드만 옛 값을 보여주고 있었다.
  // 보낸 키만 덮어쓰고 나머지는 남긴다.
  let stored: Record<string, unknown> = {};
  if (existing?.content_body) {
    try {
      const parsed = JSON.parse(existing.content_body);
      if (parsed && typeof parsed === 'object') stored = parsed;
    } catch {
      // 저장된 값이 깨져 있으면 이번에 보낸 값으로 새로 시작한다.
    }
  }
  const contentBody = JSON.stringify({ ...stored, ...body });

  let dbError = null;

  if (existing) {
    const { error } = await supabaseAdmin
      .from('contents')
      .update({ content_body: contentBody })
      .eq('title', SYSTEM_TITLE);
    dbError = error;
  } else {
    const { error } = await supabaseAdmin
      .from('contents')
      .insert({
        title: SYSTEM_TITLE,
        content_type: 'SYSTEM_DEADLINES',
        content_body: contentBody,
        status: 'active',
        author_name: 'SYSTEM',
      });
    dbError = error;
  }

  if (dbError) {
    console.error('[Deadlines API] DB error:', dbError);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Invalidate dashboard cache so changes appear immediately
  revalidatePath('/dashboard');

  return NextResponse.json({ ok: true });
}
