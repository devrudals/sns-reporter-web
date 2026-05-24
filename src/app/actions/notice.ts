'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createNotice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const isMaster = user.email === 'admin@admin.com';
  const isDesignatedAdmin = user.user_metadata?.is_admin === true;

  if (!isMaster && !isDesignatedAdmin) {
    return { success: false, error: 'Forbidden. Only admins can create notices.' };
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const isImportant = formData.get('isImportant') === 'on' || formData.get('isImportant') === 'true';

  if (!title || !content) {
    return { success: false, error: 'Title and content are required.' };
  }

  const category = isMaster ? '미디어센터' : '단장단';
  const status = isImportant ? 'IMPORTANT' : 'NORMAL';

  const { error } = await supabase.from('contents').insert({
    content_type: 'NOTICE',
    title: title,
    content_body: content,
    team: category, // Using team to store category (미디어센터/단장단)
    author_name: category, // Using author_name to store category as well
    status: status,
    created_at: new Date().toISOString()
  });

  if (error) {
    console.error('Error creating notice:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/notices');
  revalidatePath('/dashboard');
  return { success: true };
}
