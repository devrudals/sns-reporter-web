'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function setAdminRole(targetUserId: string, isAdmin: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if current user is admin
  const isMaster = user.email === 'admin@admin.com';
  const isDesignatedAdmin = user.user_metadata?.is_admin === true;

  if (!isMaster && !isDesignatedAdmin) {
    return { success: false, error: 'Forbidden' };
  }

  // Update target user using admin client
  const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
    user_metadata: { is_admin: isAdmin }
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
