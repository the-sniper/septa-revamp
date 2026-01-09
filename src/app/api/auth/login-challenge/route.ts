
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserByUsername, getUserAuthenticators } from '@/lib/db';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username } = body; // Optional: if provided, we can offer allowCredentials

    let userAuthenticators: any[] = [];
    
    if (username) {
        const user = await getUserByUsername(username);
        if (user) {
            const auths = await getUserAuthenticators(user.id);
            userAuthenticators = auths.map(auth => ({
                id: Buffer.from(auth.credential_id, 'base64url'), // Convert back to Buffer/Uint8Array for options
                transports: auth.transports,
            }));
        }
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: userAuthenticators.length > 0 ? userAuthenticators : undefined,
      userVerification: 'preferred',
    });

    // Save challenge
    (await cookies()).set('login-challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 5,
      path: '/',
    });

    return NextResponse.json(options);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
