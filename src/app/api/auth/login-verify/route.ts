
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthenticator, getUserSecret, saveAuthenticator } from '@/lib/db';
import crypto from 'crypto';

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-must-be-32-bytes!';

function getCipherKey() {
    if (Buffer.from(ENCRYPTION_KEY).length !== 32) {
       return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    }
    return Buffer.from(ENCRYPTION_KEY);
}

function decrypt(encryptedText: string, ivHex: string, authTagHex: string) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', getCipherKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { response } = body;

    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get('login-challenge')?.value;

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired or missing' }, { status: 400 });
    }

    // Find authenticator in DB
    const authenticator = await getAuthenticator(response.id);
    if (!authenticator) {
      return NextResponse.json({ error: 'Authenticator not found' }, { status: 404 });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credential_id, 'base64url'), // stored as base64url string
        credentialPublicKey: Buffer.from(authenticator.credential_public_key, 'base64url'),
        counter: Number(authenticator.counter),
        transports: authenticator.transports,
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      // Update counter
      await saveAuthenticator({
        ...authenticator, 
        counter: Number(verification.authenticationInfo.newCounter)
      });

      // Decrypt credentials
      const userSecret = await getUserSecret(authenticator.user_id);
      if (!userSecret) {
         return NextResponse.json({ error: 'No stored credentials found' }, { status: 404 });
      }

      // Parse stored encrypted data (format: "content:tag")
      const parts = userSecret.encrypted_data.split(':');
      if (parts.length !== 2) {
          return NextResponse.json({ error: 'Corrupted credential data' }, { status: 500 });
      }
      
      try {
          const decryptedJson = decrypt(parts[0], userSecret.iv, parts[1]);
          const credentials = JSON.parse(decryptedJson); // { username, password }

          // Clean up challenge
          cookieStore.delete('login-challenge');
          
          return NextResponse.json({ 
              verified: true,
              credentials // Send back to client to perform SEPTA login
          });
      } catch (e) {
          console.error('Decryption failed:', e);
          return NextResponse.json({ error: 'Failed to decrypt credentials' }, { status: 500 });
      }
    }

    return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Error' }, { status: 500 });
  }
}
