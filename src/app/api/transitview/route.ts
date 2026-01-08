import { NextResponse } from 'next/server';

const SEPTA_API_BASE = 'https://www3.septa.org/api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get('route');

  if (!routeId) {
    return NextResponse.json(
      { error: 'route is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${SEPTA_API_BASE}/TransitView/index.php?route=${routeId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`SEPTA API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transit view:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transit view' },
      { status: 500 }
    );
  }
}

