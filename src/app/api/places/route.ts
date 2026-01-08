import { NextRequest, NextResponse } from 'next/server';

// Google Places API proxy to keep API key secure
// Set GOOGLE_PLACES_API_KEY in your environment variables

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const type = searchParams.get('type') || 'autocomplete'; // autocomplete, details, or reverse

  // Query is required for autocomplete and details, but not for reverse geocoding
  if (!query && type !== 'reverse') {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ 
      error: 'Google Places API not configured',
      message: 'Set GOOGLE_PLACES_API_KEY environment variable'
    }, { status: 503 });
  }

  try {
    if (type === 'autocomplete') {
      // Place Autocomplete API
      const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
      url.searchParams.set('input', query!);
      url.searchParams.set('key', GOOGLE_API_KEY);
      url.searchParams.set('components', 'country:us'); // Limit to US
      url.searchParams.set('location', '39.9526,-75.1652'); // Philadelphia center
      url.searchParams.set('radius', '50000'); // 50km radius
      url.searchParams.set('types', 'establishment|geocode'); // Places and addresses

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === 'OK') {
        return NextResponse.json({
          predictions: data.predictions.map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text,
            secondaryText: p.structured_formatting?.secondary_text,
          }))
        });
      } else {
        return NextResponse.json({ 
          error: data.status,
          predictions: [] 
        });
      }
    } else if (type === 'details') {
      // Place Details API to get coordinates
      const placeId = query!;
      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.set('place_id', placeId);
      url.searchParams.set('key', GOOGLE_API_KEY);
      url.searchParams.set('fields', 'name,formatted_address,geometry');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === 'OK') {
        return NextResponse.json({
          name: data.result.name,
          address: data.result.formatted_address,
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        });
      } else {
        return NextResponse.json({ error: data.status }, { status: 400 });
      }
    } else if (type === 'reverse') {
      // Reverse Geocoding - get address from coordinates
      const lat = searchParams.get('lat');
      const lng = searchParams.get('lng');
      
      if (!lat || !lng) {
        return NextResponse.json({ error: 'lat and lng required for reverse geocoding' }, { status: 400 });
      }

      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('latlng', `${lat},${lng}`);
      url.searchParams.set('key', GOOGLE_API_KEY);
      url.searchParams.set('result_type', 'street_address|route|neighborhood|sublocality');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === 'OK' && data.results?.length > 0) {
        const result = data.results[0];
        // Extract a short, readable address (street + neighborhood/city)
        const addressComponents = result.address_components || [];
        const streetNumber = addressComponents.find((c: any) => c.types.includes('street_number'))?.short_name || '';
        const street = addressComponents.find((c: any) => c.types.includes('route'))?.short_name || '';
        const neighborhood = addressComponents.find((c: any) => c.types.includes('neighborhood'))?.short_name || 
                            addressComponents.find((c: any) => c.types.includes('sublocality'))?.short_name || '';
        const city = addressComponents.find((c: any) => c.types.includes('locality'))?.short_name || 'Philadelphia';
        
        // Build a concise address like "1234 Market St, Center City"
        let shortAddress = '';
        if (streetNumber && street) {
          shortAddress = `${streetNumber} ${street}`;
        } else if (street) {
          shortAddress = `Near ${street}`;
        } else if (neighborhood) {
          shortAddress = neighborhood;
        }
        
        if (neighborhood && shortAddress !== neighborhood) {
          shortAddress += `, ${neighborhood}`;
        } else if (city && !shortAddress.includes(city)) {
          shortAddress += `, ${city}`;
        }

        return NextResponse.json({
          address: shortAddress || result.formatted_address,
          fullAddress: result.formatted_address,
        });
      } else if (data.status === 'ZERO_RESULTS') {
        return NextResponse.json({ address: 'Unknown location' });
      } else {
        return NextResponse.json({ error: data.status }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Google Places API error:', error);
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
}

