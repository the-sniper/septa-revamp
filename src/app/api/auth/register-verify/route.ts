
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserByUsername, saveAuthenticator, saveUserSecret } from '@/lib/db';
import crypto from 'crypto';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Encryption setup
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-must-be-32-bytes!'; 
// In prod, ensure ENCRYPTION_KEY is 32 bytes (256 bits)
// For dev safety, we can pad/slice if needed, but best to enforce via env.
function getCipherKey() {
    if (Buffer.from(ENCRYPTION_KEY).length !== 32) {
       // Fallback for dev if key is not 32 bytes (not recommended for prod)
       return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    }
    return Buffer.from(ENCRYPTION_KEY);
}

function encrypt(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getCipherKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Store Auth Tag with data so we can verify integrity
  return {
    iv: iv.toString('hex'),
    content: encrypted,
    tag: authTag 
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { response, headers, septaCredentials } = body; // septaCredentials = { username, password }

    if (!septaCredentials || !septaCredentials.username || !septaCredentials.password) {
        return NextResponse.json({ error: 'Missing SEPTA credentials to secure' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get('reg-challenge')?.value;

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired or missing' }, { status: 400 });
    }

    // Determine expected origin
    // Sometimes local dev might use different port, adjust as needed. SimpleWebAuthn checks exact match.
    
    // Retrieve user
    const user = await getUserByUsername(septaCredentials.username);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      // 1. Save Authenticator
      await saveAuthenticator({
        credential_id: Buffer.from(credentialID).toString('base64url'), // Save as URL-safe base64
        credential_public_key: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        credential_device_type: credentialDeviceType,
        credential_backed_up: credentialBackedUp,
        user_id: user.id
      });

      // 2. Encrypt & Save User Secrets
      // We store the whole object { username, password } as a JSON string
      const secretData = JSON.stringify(septaCredentials);
      const encrypted = encrypt(secretData);
      
      // We store IV and "content:tag" combined or separate. DB schema has 'encrypted_data' and 'iv'.
      // Let's store tag appended to content or separated. 
      // A common pattern: encrypted_data = content + ":" + tag
      await saveUserSecret(
          user.id, 
          `${encrypted.content}:${encrypted.tag}`, 
          encrypted.iv
      );

      // Clear challenge
      cookieStore.delete('reg-challenge');

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Error' }, { status: 500 });
  }
}
