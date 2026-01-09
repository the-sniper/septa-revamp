
import { NextResponse } from 'next/server';
import { getUserByUsername, getUserAuthenticators } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ enabled: false });
    }

    const auths = await getUserAuthenticators(user.id);
    return NextResponse.json({ enabled: auths.length > 0 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
