import { NextRequest, NextResponse } from 'next/server';

// Google Directions API with Transit mode
// This provides multimodal routing (bus, train, subway, trolley, walking)

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Decode Google's polyline encoding
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const originLat = searchParams.get('originLat');
  const originLng = searchParams.get('originLng');
  const destLat = searchParams.get('destLat');
  const destLng = searchParams.get('destLng');

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json({ error: 'Origin and destination coordinates required' }, { status: 400 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ 
      error: 'Google API not configured',
      message: 'Set GOOGLE_PLACES_API_KEY environment variable'
    }, { status: 503 });
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', `${originLat},${originLng}`);
    url.searchParams.set('destination', `${destLat},${destLng}`);
    url.searchParams.set('mode', 'transit');
    url.searchParams.set('alternatives', 'true');
    url.searchParams.set('departure_time', 'now');
    url.searchParams.set('key', GOOGLE_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'OK' && data.routes) {
      const routes = data.routes.map((route: any) => {
        const leg = route.legs[0];
        
        // Extract transit steps with coordinates
        const steps = leg.steps.map((step: any) => {
          // Decode polyline for this step
          const polyline = step.polyline?.points 
            ? decodePolyline(step.polyline.points)
            : [];

          if (step.travel_mode === 'TRANSIT') {
            const transit = step.transit_details;
            return {
              mode: 'transit',
              type: transit.line.vehicle.type,
              lineName: transit.line.short_name || transit.line.name,
              lineColor: transit.line.color,
              lineTextColor: transit.line.text_color,
              headsign: transit.headsign,
              departureStop: transit.departure_stop.name,
              arrivalStop: transit.arrival_stop.name,
              departureTime: transit.departure_time.text,
              arrivalTime: transit.arrival_time.text,
              departureTimestamp: transit.departure_time.value,
              numStops: transit.num_stops,
              duration: step.duration.text,
              durationValue: step.duration.value,
              agency: transit.line.agencies?.[0]?.name,
              // Location data for navigation
              startLocation: {
                lat: step.start_location.lat,
                lng: step.start_location.lng,
              },
              endLocation: {
                lat: step.end_location.lat,
                lng: step.end_location.lng,
              },
              departureLocation: {
                lat: transit.departure_stop.location.lat,
                lng: transit.departure_stop.location.lng,
              },
              arrivalLocation: {
                lat: transit.arrival_stop.location.lat,
                lng: transit.arrival_stop.location.lng,
              },
              polyline,
            };
          } else if (step.travel_mode === 'WALKING') {
            return {
              mode: 'walking',
              duration: step.duration.text,
              durationValue: step.duration.value,
              distance: step.distance.text,
              instructions: step.html_instructions?.replace(/<[^>]*>/g, '') || 'Walk',
              startLocation: {
                lat: step.start_location.lat,
                lng: step.start_location.lng,
              },
              endLocation: {
                lat: step.end_location.lat,
                lng: step.end_location.lng,
              },
              polyline,
            };
          }
          return null;
        }).filter(Boolean);

        // Decode full route polyline
        const overviewPolyline = route.overview_polyline?.points
          ? decodePolyline(route.overview_polyline.points)
          : [];

        return {
          summary: route.summary,
          duration: leg.duration.text,
          durationValue: leg.duration.value,
          departureTime: leg.departure_time?.text,
          arrivalTime: leg.arrival_time?.text,
          departureTimestamp: leg.departure_time?.value,
          distance: leg.distance.text,
          steps,
          overviewPolyline,
          bounds: {
            northeast: route.bounds?.northeast,
            southwest: route.bounds?.southwest,
          },
          startLocation: {
            lat: leg.start_location.lat,
            lng: leg.start_location.lng,
          },
          endLocation: {
            lat: leg.end_location.lat,
            lng: leg.end_location.lng,
          },
        };
      });

      return NextResponse.json({ routes });
    } else if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json({ 
        routes: [],
        message: 'No transit routes found. Try a different destination or time.'
      });
    } else {
      return NextResponse.json({ 
        error: data.status,
        message: data.error_message || 'Failed to get directions'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Directions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch directions' }, { status: 500 });
  }
}

