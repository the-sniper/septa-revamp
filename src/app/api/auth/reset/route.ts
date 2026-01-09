
import { NextResponse } from 'next/server';
import { getUserByUsername, supabaseAdmin } from '@/lib/db';

// We need to export this from db.ts or just import the admin client directly as we do here.
// But we need to update db.ts to export supabaseAdmin if it's not already,
// Actually it is exported from 'src/lib/supabase.ts' which db.ts imports.
// Let's just import from supabase.ts directly.
import { supabaseAdmin as adminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
        return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' });
    }

    // Delete authenticators and secrets
    // Cascading delete on user would work if we wanted to remove the user entirely,
    // but maybe we want to keep the user ID stable?
    // The schema says: user_id references public.users(id) on delete cascade
    // But we probably just want to remove the credentials for this feature "Disable Touch ID", not the user record itself necessarily?
    // Actually, if we remove all authenticators, they are effectively disabled.
    
    const { error: authError } = await adminClient
        .from('authenticators')
        .delete()
        .eq('user_id', user.id);

    if (authError) throw authError;

    const { error: secretError } = await adminClient
        .from('user_secrets')
        .delete()
        .eq('user_id', user.id);

    if (secretError) throw secretError;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
