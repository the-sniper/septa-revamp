import { NextResponse } from 'next/server';

const SEPTA_API_BASE = 'https://www3.septa.org/api';

// Philadelphia area bounding box for geocoding
const PHILLY_BOUNDS = {
  north: 40.15,
  south: 39.85,
  east: -74.9,
  west: -75.35,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'query parameter q is required' },
      { status: 400 }
    );
  }

  try {
    const results: SearchResult[] = [];

    // 1. Search SEPTA stations/stops using the locations API with a central point
    // We'll search from multiple points to get better coverage
    const searchPoints = [
      { lat: 39.9526, lon: -75.1652 }, // Center City
      { lat: 39.9557, lon: -75.1822 }, // 30th Street
      { lat: 40.0236, lon: -75.0816 }, // Frankford
      { lat: 39.9694, lon: -75.2593 }, // 69th Street
    ];

    const locationPromises = searchPoints.map(point =>
      fetch(
        `${SEPTA_API_BASE}/locations/get_locations.php?lat=${point.lat}&lon=${point.lon}&radius=5&type=bus_stops`,
        { next: { revalidate: 3600 } }
      ).then(r => r.json()).catch(() => [])
    );

    const allLocations = await Promise.all(locationPromises);
    const flatLocations = allLocations.flat();
    
    // Filter locations by query
    const queryLower = query.toLowerCase();
    const matchingLocations = flatLocations
      .filter((loc: SeptaLocation) => 
        loc.location_name?.toLowerCase().includes(queryLower)
      )
      .slice(0, 10);

    // Add matching SEPTA stops
    for (const loc of matchingLocations) {
      results.push({
        type: 'stop',
        id: loc.location_id,
        name: loc.location_name,
        lat: parseFloat(loc.location_lat),
        lon: parseFloat(loc.location_lon),
      });
    }

    // 2. Use OpenStreetMap Nominatim for general location search (free, no API key needed)
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Philadelphia, PA')}&format=json&limit=5&bounded=1&viewbox=${PHILLY_BOUNDS.west},${PHILLY_BOUNDS.north},${PHILLY_BOUNDS.east},${PHILLY_BOUNDS.south}`,
      {
        headers: {
          'User-Agent': 'SEPTA-App/1.0',
        },
        next: { revalidate: 3600 },
      }
    );

    if (nominatimResponse.ok) {
      const places = await nominatimResponse.json();
      for (const place of places) {
        // Avoid duplicates
        const isDuplicate = results.some(
          r => Math.abs(r.lat - parseFloat(place.lat)) < 0.001 && 
               Math.abs(r.lon - parseFloat(place.lon)) < 0.001
        );
        if (!isDuplicate) {
          results.push({
            type: 'place',
            id: place.place_id.toString(),
            name: place.display_name.split(',').slice(0, 2).join(','),
            fullName: place.display_name,
            lat: parseFloat(place.lat),
            lon: parseFloat(place.lon),
          });
        }
      }
    }

    // 3. Add well-known Philadelphia landmarks
    const landmarks = getMatchingLandmarks(queryLower);
    for (const landmark of landmarks) {
      const isDuplicate = results.some(
        r => Math.abs(r.lat - landmark.lat) < 0.001 && 
             Math.abs(r.lon - landmark.lon) < 0.001
      );
      if (!isDuplicate) {
        results.push(landmark);
      }
    }

    return NextResponse.json({
      results: results.slice(0, 15),
      query,
    });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}

interface SearchResult {
  type: 'stop' | 'place' | 'landmark';
  id: string;
  name: string;
  fullName?: string;
  lat: number;
  lon: number;
}

interface SeptaLocation {
  location_id: string;
  location_name: string;
  location_lat: string;
  location_lon: string;
}

// Well-known Philadelphia landmarks for quick matching
const LANDMARKS: SearchResult[] = [
  { type: 'landmark', id: 'fashion-district', name: 'Fashion District Philadelphia', lat: 39.9519, lon: -75.1534 },
  { type: 'landmark', id: 'reading-terminal', name: 'Reading Terminal Market', lat: 39.9533, lon: -75.1592 },
  { type: 'landmark', id: 'city-hall', name: 'Philadelphia City Hall', lat: 39.9526, lon: -75.1635 },
  { type: 'landmark', id: 'love-park', name: 'LOVE Park', lat: 39.9543, lon: -75.1657 },
  { type: 'landmark', id: 'art-museum', name: 'Philadelphia Museum of Art', lat: 39.9656, lon: -75.1810 },
  { type: 'landmark', id: 'temple-university', name: 'Temple University', lat: 39.9812, lon: -75.1495 },
  { type: 'landmark', id: 'upenn', name: 'University of Pennsylvania', lat: 39.9522, lon: -75.1932 },
  { type: 'landmark', id: 'drexel', name: 'Drexel University', lat: 39.9566, lon: -75.1899 },
  { type: 'landmark', id: 'independence-hall', name: 'Independence Hall', lat: 39.9489, lon: -75.1500 },
  { type: 'landmark', id: 'liberty-bell', name: 'Liberty Bell', lat: 39.9496, lon: -75.1503 },
  { type: 'landmark', id: 'phl-airport', name: 'Philadelphia International Airport', lat: 39.8744, lon: -75.2424 },
  { type: 'landmark', id: 'zoo', name: 'Philadelphia Zoo', lat: 39.9742, lon: -75.1956 },
  { type: 'landmark', id: 'please-touch', name: 'Please Touch Museum', lat: 39.9792, lon: -75.2092 },
  { type: 'landmark', id: 'wells-fargo', name: 'Wells Fargo Center', lat: 39.9012, lon: -75.1720 },
  { type: 'landmark', id: 'lincoln-financial', name: 'Lincoln Financial Field', lat: 39.9008, lon: -75.1675 },
  { type: 'landmark', id: 'citizens-bank', name: 'Citizens Bank Park', lat: 39.9061, lon: -75.1665 },
  { type: 'landmark', id: '30th-street', name: '30th Street Station', lat: 39.9557, lon: -75.1822 },
  { type: 'landmark', id: 'suburban-station', name: 'Suburban Station', lat: 39.9539, lon: -75.1680 },
  { type: 'landmark', id: 'jefferson-station', name: 'Jefferson Station', lat: 39.9525, lon: -75.1581 },
  { type: 'landmark', id: 'chinatown', name: 'Chinatown', lat: 39.9555, lon: -75.1545 },
  { type: 'landmark', id: 'rittenhouse', name: 'Rittenhouse Square', lat: 39.9496, lon: -75.1718 },
  { type: 'landmark', id: 'navy-yard', name: 'Navy Yard', lat: 39.8903, lon: -75.1785 },
  { type: 'landmark', id: 'manayunk', name: 'Manayunk', lat: 40.0268, lon: -75.2246 },
  { type: 'landmark', id: 'chestnut-hill', name: 'Chestnut Hill', lat: 40.0779, lon: -75.2085 },
  { type: 'landmark', id: 'old-city', name: 'Old City', lat: 39.9508, lon: -75.1449 },
  { type: 'landmark', id: 'south-street', name: 'South Street', lat: 39.9403, lon: -75.1497 },
  { type: 'landmark', id: 'northern-liberties', name: 'Northern Liberties', lat: 39.9669, lon: -75.1402 },
  { type: 'landmark', id: 'fishtown', name: 'Fishtown', lat: 39.9733, lon: -75.1291 },
  { type: 'landmark', id: 'kensington', name: 'Kensington', lat: 39.9892, lon: -75.1228 },
];

function getMatchingLandmarks(query: string): SearchResult[] {
  return LANDMARKS.filter(l => 
    l.name.toLowerCase().includes(query) ||
    l.id.includes(query.replace(/\s+/g, '-'))
  ).slice(0, 5);
}

