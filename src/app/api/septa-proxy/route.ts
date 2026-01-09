import { NextRequest, NextResponse } from 'next/server';
import { loginToSepta, formatSeptaData } from '@/lib/septa-api';

export const maxDuration = 60; // Standard timeout

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Use the direct API client
    const result = await loginToSepta(username, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Map the data to our app's format
    const formattedData = formatSeptaData(result.data);

    return NextResponse.json({
      success: true,
      data: formattedData,
    });

  } catch (error) {
    console.error('[SEPTA-API] Proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    mode: 'direct-api',
  });
}
