import { NextResponse } from 'next/server';

const SEPTA_API_BASE = 'https://www3.septa.org/api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get('route');

  try {
    const url = routeId
      ? `${SEPTA_API_BASE}/Alerts/index.php?route=${routeId}`
      : `${SEPTA_API_BASE}/Alerts/index.php`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`SEPTA API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

