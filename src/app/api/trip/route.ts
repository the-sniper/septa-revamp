import { NextResponse } from 'next/server';

const SEPTA_API_BASE = 'https://www3.septa.org/api';

// Valid SEPTA Regional Rail stations for NextToArrive API
const REGIONAL_RAIL_STATIONS = [
  '30th Street Station',
  'Suburban Station', 
  'Jefferson Station',
  'Temple University',
  'North Broad',
  'Wayne Junction',
  'Fern Rock Transportation Center',
  'Melrose Park',
  'Elkins Park',
  'Jenkintown-Wyncote',
  'Noble',
  'Rydal',
  'Meadowbrook',
  'Bethayres',
  'Philmont',
  'Forest Hills',
  'Somerton',
  'Trevose',
  'Neshaminy Falls',
  'Langhorne',
  'Woodbourne',
  'Yardley',
  'West Trenton',
  'Airport Terminal A',
  'Airport Terminal B',
  'Airport Terminal C-D',
  'Airport Terminal E-F',
  'Eastwick',
  'University City',
  'Ardmore',
  'Haverford',
  'Bryn Mawr',
  'Rosemont',
  'Villanova',
  'Radnor',
  'St. Davids',
  'Wayne',
  'Strafford',
  'Devon',
  'Berwyn',
  'Daylesford',
  'Paoli',
  'Malvern',
  'Exton',
  'Whitford',
  'Downingtown',
  'Thorndale',
  'Norristown Transportation Center',
  'Main Street',
  'Norristown - Elm Street',
  'Conshohocken',
  'Spring Mill',
  'Miquon',
  'Wissahickon',
  'Manayunk',
  'Ivy Ridge',
  'East Falls',
  'Allegheny',
  'North Philadelphia',
  'Bridesburg',
  'Tacony',
  'Holmesburg Junction',
  'Torresdale',
  'Cornwells Heights',
  'Eddington',
  'Croydon',
  'Bristol',
  'Levittown',
  'Trenton',
  'Chestnut Hill East',
  'Chestnut Hill West',
  'Highland',
  'St. Martins',
  'Allen Lane',
  'Carpenter',
  'Upsal',
  'Tulpehocken',
  'Chelten Avenue',
  'Queen Lane',
  'Wister',
  'Germantown',
  'Washington Lane',
  'Stenton',
  'Sedgwick',
  'Mount Airy',
  'Wyndmoor',
  'Gravers',
  'Cresheim Valley Drive',
  'Willow Grove',
  'Hatboro',
  'Warminster',
  'Glenside',
  'Ardsley',
  'Roslyn',
  'Oreland',
  'North Wales',
  'Pennbrook',
  'Lansdale',
  'Fortuna',
  'Colmar',
  'Link Belt',
  'Chalfont',
  'New Britain',
  'Delaware Valley College',
  'Doylestown',
  'Media',
  'Wawa',
  'Swarthmore',
  'Morton',
  'Secane',
  'Primos',
  'Clifton-Aldan',
  'Gladstone',
  'Lansdowne',
  'Fernwood-Yeadon',
  'Angora',
  '49th Street',
  'Chester Transportation Center',
  'Highland Avenue',
  'Marcus Hook',
  'Claymont',
  'Wilmington',
  'Churchmans Crossing',
  'Newark',
  'Cynwyd',
  'Bala',
  'Wynnefield Avenue',
  'Overbrook',
  'Merion',
  'Narberth',
];

// Find the closest matching station name
function findStation(query: string): string | null {
  const queryLower = query.toLowerCase().trim();
  
  // Direct match
  for (const station of REGIONAL_RAIL_STATIONS) {
    if (station.toLowerCase() === queryLower) {
      return station;
    }
  }
  
  // Partial match
  for (const station of REGIONAL_RAIL_STATIONS) {
    if (station.toLowerCase().includes(queryLower) || 
        queryLower.includes(station.toLowerCase().replace(' station', '').replace(' transportation center', ''))) {
      return station;
    }
  }
  
  // Common aliases
  const aliases: Record<string, string> = {
    '30th street': '30th Street Station',
    '30th st': '30th Street Station',
    'suburban': 'Suburban Station',
    'jefferson': 'Jefferson Station',
    'market east': 'Jefferson Station',
    'temple': 'Temple University',
    'airport': 'Airport Terminal E-F',
    'phl': 'Airport Terminal E-F',
    'phl airport': 'Airport Terminal E-F',
    'philadelphia airport': 'Airport Terminal E-F',
    'university city': 'University City',
    'upenn': 'University City',
    'penn': 'University City',
    'drexel': 'University City',
    'trenton': 'Trenton',
    'paoli': 'Paoli',
    'norristown': 'Norristown Transportation Center',
    'chestnut hill': 'Chestnut Hill East',
    'doylestown': 'Doylestown',
    'lansdale': 'Lansdale',
    'wilmington': 'Wilmington',
    'newark': 'Newark',
    'media': 'Media',
    'wawa': 'Wawa',
    'warminster': 'Warminster',
    'fern rock': 'Fern Rock Transportation Center',
  };
  
  for (const [alias, station] of Object.entries(aliases)) {
    if (queryLower.includes(alias)) {
      return station;
    }
  }
  
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');

  if (!origin || !destination) {
    return NextResponse.json(
      { error: 'origin and destination are required' },
      { status: 400 }
    );
  }

  // Try to find matching Regional Rail stations
  const originStation = findStation(origin);
  const destStation = findStation(destination);

  if (!originStation || !destStation) {
    // Return helpful error with suggestions
    const suggestions = [];
    if (!originStation) {
      suggestions.push(`Origin "${origin}" is not a Regional Rail station`);
    }
    if (!destStation) {
      suggestions.push(`Destination "${destination}" is not a Regional Rail station`);
    }
    
    return NextResponse.json({
      error: 'Regional Rail stations required',
      message: 'The trip planner currently supports Regional Rail stations only.',
      suggestions,
      availableStations: REGIONAL_RAIL_STATIONS.slice(0, 20),
    }, { status: 200 }); // Return 200 so frontend can display the message
  }

  try {
    const response = await fetch(
      `${SEPTA_API_BASE}/NextToArrive/index.php?req1=${encodeURIComponent(originStation)}&req2=${encodeURIComponent(destStation)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      // Try to get error details
      const text = await response.text();
      console.error('SEPTA API error:', text);
      return NextResponse.json({
        error: 'No trips found',
        message: `Could not find trips from ${originStation} to ${destStation}`,
        originStation,
        destStation,
      }, { status: 200 });
    }

    const data = await response.json();
    
    // If empty array, no trips found
    if (Array.isArray(data) && data.length === 0) {
      return NextResponse.json({
        error: 'No trips available',
        message: `No upcoming trips from ${originStation} to ${destStation}`,
        originStation,
        destStation,
      }, { status: 200 });
    }

    return NextResponse.json({
      trips: data,
      originStation,
      destStation,
    });
  } catch (error) {
    console.error('Error fetching trip:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch trip information',
        message: 'Please try again later',
      },
      { status: 500 }
    );
  }
}
