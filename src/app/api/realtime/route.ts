import { NextResponse } from 'next/server';

const SEPTA_API_BASE = 'https://www3.septa.org/api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stopId = searchParams.get('stop_id');

  if (!stopId) {
    return NextResponse.json(
      { error: 'stop_id is required' },
      { status: 400 }
    );
  }

  try {
    // Use BusSchedules API which provides scheduled arrivals for bus/trolley stops
    const response = await fetch(
      `${SEPTA_API_BASE}/BusSchedules/index.php?stop_id=${stopId}`,
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
    
    // Check if SEPTA returned an error message
    if (data.error) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching realtime data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch realtime data' },
      { status: 500 }
    );
  }
}

