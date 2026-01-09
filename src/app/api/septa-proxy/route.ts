import { NextRequest, NextResponse } from 'next/server';
import { loginToSepta, formatSeptaData } from '@/lib/septa-api';

export const maxDuration = 60; // Standard timeout

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, action } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Handle Add Funds
    if (action === 'add_funds') {
        const { amount, paymentProfileId, cvv } = body;
        // Import addFunds dynamically or ensure it's imported at top
        const { addFunds } = await import('@/lib/septa-api');
        
        const result = await addFunds(username, password, amount, paymentProfileId, cvv);
        
        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || 'Add funds failed' },
                { status: 400 }
            );
        }
        
        return NextResponse.json({
            success: true,
            data: result.data
        });
    }

    // Default: Login & Fetch Data
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
