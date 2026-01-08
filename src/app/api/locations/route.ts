import { NextResponse } from 'next/server';

const SEPTA_API_BASE = 'https://www3.septa.org/api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius') || '0.5';
  const type = searchParams.get('type') || 'bus_stops';

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'lat and lon are required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${SEPTA_API_BASE}/locations/get_locations.php?lat=${lat}&lon=${lon}&radius=${radius}&type=${type}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`SEPTA API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

