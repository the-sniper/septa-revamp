
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserByUsername, createUser } from '@/lib/db';

const RP_NAME = 'SEPTA Key Revamp';
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    // Check if user exists, or create one for the purpose of ID stability
    // In a real app, we might want to ensure they are logged in first.
    // Here, we assume the client validates they are logged in to SEPTA before calling this.
    let user = await getUserByUsername(username);
    if (!user) {
      user = await createUser(username);
    }

    if (!user) {
      return NextResponse.json({ error: 'Failed to create/find user' }, { status: 500 });
    }

    // Get user authenticators (to prevent re-registering same device if desired, 
    // but we can just allow multiple for now)
    // const authenticators = await getUserAuthenticators(user.id);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: user.id,
      userName: user.username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Force TouchID/FaceID like experience
      },
    });

    // Save challenge to cookie
    (await cookies()).set('reg-challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 5, // 5 minutes
      path: '/',
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
