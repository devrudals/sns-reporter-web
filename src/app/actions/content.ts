'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteContent(contentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Fetch the content to verify ownership
  const { data: content, error: fetchError } = await supabase
    .from('contents')
    .select('id, author_name, content_body, title')
    .eq('id', contentId)
    .single();

  if (fetchError || !content) {
    return { success: false, error: '콘텐츠를 찾을 수 없습니다.' };
  }

  // Check if user is admin
  const isMaster = user.email === 'admin@admin.com';
  const isDesignatedAdmin = user.user_metadata?.is_admin === true;
  const isAdmin = isMaster || isDesignatedAdmin;

  // Check if user is the author
  let isAuthor = false;
  try {
    const body = JSON.parse(content.content_body || '{}');
    if (body.authorEmail === user.email) isAuthor = true;
  } catch {}

  // Also check by profile name match
  const { data: profileRow } = await supabase
    .from('contents')
    .select('author_name')
    .eq('title', `PROFILE_${user.email}`)
    .single();

  const userName = profileRow?.author_name || user.user_metadata?.full_name || user.user_metadata?.name;
  if (userName && content.author_name?.includes(userName)) isAuthor = true;

  if (!isAdmin && !isAuthor) {
    return { success: false, error: '삭제 권한이 없습니다.' };
  }

  const { error } = await supabase
    .from('contents')
    .delete()
    .eq('id', contentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/contents');
  revalidatePath('/dashboard');
  revalidatePath('/proposals');
  revalidatePath('/final-works');

  return { success: true };
}
