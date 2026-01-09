import { cookies } from 'next/headers';

/**
 * SEPTA Key API Client (Reverse Engineered)
 */

const SEPTA_API_BASE = 'https://www.septakey.org/api/v1';

const COMMON_HEADERS = {
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  'X-Api-Source': 'WCI9Exs',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Sec-Ch-Ua': '"Google Chrome";v="120", "Chromium";v="120", "Not?A_Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Origin': 'https://www.septakey.org',
  'Referer': 'https://www.septakey.org/',
};

interface LoginResult {
  success: boolean;
  data?: any;
  error?: string;
  session?: {
    accessToken: string;
    cookies: string;
    userId: string | null;
  };
}

export async function loginToSepta(username: string, password: string): Promise<LoginResult> {
  try {
    // 1. LOGIN
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Body must be empty/null with Content-Length: 0
    const loginResponse = await fetch(`${SEPTA_API_BASE}/login`, {
      method: 'POST',
      headers: {
        ...COMMON_HEADERS,
        'X-Authorization': `X-Basic ${credentials}`,
        'Content-Length': '0', 
      },
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error(`[SEPTA-API] Login failed (${loginResponse.status}):`, errorText);
      return { 
        success: false, 
        error: `Login failed: ${loginResponse.status} ${loginResponse.statusText}`
      };
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.access_token || loginData.token;
    
    // Capture cookies - robust handling for Node/Next.js environments
    let cookiesArray: string[] = [];
    // @ts-ignore - getSetCookie is newer standard
    if (typeof loginResponse.headers.getSetCookie === 'function') {
      // @ts-ignore
      cookiesArray = loginResponse.headers.getSetCookie();
    } else if (loginResponse.headers.has('set-cookie')) {
      const headerVal = loginResponse.headers.get('set-cookie');
      if (headerVal) {
        cookiesArray = [headerVal]; 
      }
    }
    const cookieString = cookiesArray.map(c => c.split(';')[0]).join('; ');

    // 2. DISCOVER USER ID
    let userIdString = findStringId(loginData) || extractUserIdFromJwt(accessToken);
    
    // If not found, try robust profile fetch
    if (!userIdString) {
        // Try to fetch profile and see if we can get ID from there
        const profileRes = await fetchUserProfile(accessToken || '', cookieString);
        if (profileRes.id) {
            userIdString = profileRes.id;
        }
    }
    
    // 3. FETCH WALLET DATA
    let walletData = null;
    let tripsData: any[] = [];
    let paymentProfiles: any[] = [];

    if (userIdString) {
      const walletUrl = `${SEPTA_API_BASE}/indv_users/${userIdString}/keycard_details`;
      
      const walletResponse = await fetch(walletUrl, {
        method: 'GET',
        headers: {
          ...COMMON_HEADERS,
          'Cookie': cookieString,
          'X-Authorization': `Bearer ${accessToken}`, 
        },
      });

      if (walletResponse.ok) {
        walletData = await walletResponse.json();
        
        // 4. FETCH TRIPS
        let debugInfo = '';
        try {
            // Find keycard ID
            let keycardId = null;
            let cardObj = null;

            if (Array.isArray(walletData)) {
                // @ts-ignore
                cardObj = walletData.find((c: any) => c.status === 'Active') || walletData[0];
            } else if (walletData && typeof walletData === 'object') {
                 // @ts-ignore
                if (walletData.keycards && Array.isArray(walletData.keycards)) {
                    // @ts-ignore
                    cardObj = walletData.keycards[0];
                } else {
                     // @ts-ignore
                    cardObj = walletData;
                }
            }

            if (cardObj) {
                keycardId = cardObj.keycard_id || cardObj.id || cardObj.key || findStringId(cardObj);
            }
            
            if (keycardId && userIdString) {
                // Add a small delay to avoid race conditions or rate limits
                await new Promise(r => setTimeout(r, 500));

                // Fetch trips (10 - strictly sticking to what we know works to avoid Incapsula blocks)
                const tripsUrl = `${SEPTA_API_BASE}/indv_users/${userIdString}/keycards/${keycardId}/trips?start_index=1&end_index=10&sort=desc`;
                
                const tripsResponse = await fetch(tripsUrl, {
                    method: 'GET',
                    headers: {
                      ...COMMON_HEADERS,
                      'Referer': 'https://www.septakey.org/indv/dashboard', // More specific referer
                      'Cookie': cookieString,
                      'X-Authorization': `Bearer ${accessToken}`, 
                    },
                });

                if (tripsResponse.ok) {
                    const text = await tripsResponse.text();
                    try {
                        tripsData = JSON.parse(text);
                    } catch (jsonError) {
                       console.error('[SEPTA-API] Failed to parse trips JSON. Response was:', text.substring(0, 200));
                    }
                } else {
                    const err = await tripsResponse.text();
                    console.error(`[SEPTA-API] Trips fetch failed (${tripsResponse.status}): ${err}`);
                    debugInfo = `Trips fetch failed: ${tripsResponse.status}`;
                }
            } else {
                debugInfo = `Missing IDs: User=${!!userIdString}, Card=${!!keycardId}`;
            }
        } catch (e) {
            console.error('[SEPTA-API] Trip fetch exception:', e);
            debugInfo = `Trip exception: ${e instanceof Error ? e.message : String(e)}`;
        }

      } else {
        const errText = await walletResponse.text();
        console.error(`[SEPTA-API] Wallet fetch failed (${walletResponse.status}): ${errText}`);
        return {
            success: false,
            error: `Wallet fetch failed: ${walletResponse.status}`
        };
      }

      // 5. FETCH PAYMENT PROFILES
      if (userIdString) {
        try {
            const paymentsUrl = `${SEPTA_API_BASE}/indv_users/${userIdString}/payment_profiles`;
            const paymentsRes = await fetch(paymentsUrl, {
                method: 'GET',
                headers: {
                    ...COMMON_HEADERS,
                    'Cookie': cookieString,
                    'X-Authorization': `Bearer ${accessToken}`,
                }
            });
            if (paymentsRes.ok) {
                const text = await paymentsRes.text();
                // It might be wrapped in brackets or an object
                try {
                  const json = JSON.parse(text);
                  if (Array.isArray(json)) paymentProfiles = json;
                  else if (json.payment_profiles && Array.isArray(json.payment_profiles)) paymentProfiles = json.payment_profiles;
                  else if (json.data && Array.isArray(json.data)) paymentProfiles = json.data;
                  else paymentProfiles = [json]; // fallback
                } catch {
                   // ignore
                }
            }
        } catch (e) {
            console.error('[SEPTA-API] Failed to fetch payment profiles', e);
        }
      }

      // Return successful data with session tokens for reuse
      return { 
        success: true, 
        // @ts-ignore
        data: { 
            ...(Array.isArray(walletData) ? { cards: walletData } : walletData), 
            trips: tripsData,
            paymentProfiles 
        },
        session: {
            accessToken,
            cookies: cookieString,
            userId: userIdString
        }
      };

    } else {
      console.error('[SEPTA-API] Could not find User ID to fetch wallet');
      return {
          success: false,
          error: 'Could not find User ID'
      };
    }

  } catch (error) {
    console.error('[SEPTA-API] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function addFunds(
    username: string, 
    password: string, 
    amount: number, 
    paymentProfileId: string, 
    cvv: string
): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
        // 1. LOGIN
        const loginResult = await loginToSepta(username, password);
        
        // @ts-ignore - session key exists now
        if (!loginResult.success || !loginResult.session) {
            return { success: false, error: loginResult.error || 'Login failed' };
        }

        // @ts-ignore
        const { session, data } = loginResult;
        const { accessToken, cookies, userId } = session;

        // Find active card - Robust logic matching formatSeptaData
        let card = null;
        if (data.cards && Array.isArray(data.cards)) {
             card = data.cards.find((c: any) => c.status === 'Active') || data.cards[0];
        } else if (data.keycards && Array.isArray(data.keycards)) {
             // @ts-ignore
             card = data.keycards[0];
        } else {
             // fallback: data itself might be the card properties merged
             card = data;
        }

        if (!card) return { success: false, error: 'No active card found in session data' };

        let keycardId = card.keycard_id || card.id || card.key; 
        
        // Use robust utility if simple lookup fails
        if (!keycardId) {
            keycardId = findStringId(card);
        }

        // 2. PLACE ORDER
        if (!keycardId) {
             console.error('[SEPTA-API] Failed to find ID in card object:', JSON.stringify(card));
             return { success: false, error: 'Could not identify KeyCard ID. Please try refreshing.' };
        }

        const orderUrl = `${SEPTA_API_BASE}/indv_users/${userId}/quick_orders`;

        // Payload structure as per user request
        const payload = {
            order_info: {
                fare_media_id: keycardId,
                cart_type: "Add Product",
                products: [
                    {
                        line_item_number: 1,
                        product_id: "OjBcSQM3BxgE", // SEPTA Travel Wallet Product ID
                        product_price: amount,
                        fare_media_id: keycardId
                    }
                ],
                payment_profiles: [
                    {
                        line_item_number: 1,
                        payment_profile_id: paymentProfileId,
                        payment_method: "Credit Card",
                        credit_card_info: {
                            cvv: cvv
                        },
                        payment_amount: amount
                    }
                ]
            }
        };

        const orderResponse = await fetch(orderUrl, {
            method: 'POST',
            headers: {
                ...COMMON_HEADERS,
                'Cookie': cookies,
                'X-Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload)
        });

        if (orderResponse.ok) {
            const result = await orderResponse.json();
            return { success: true, data: result };
        } else {
            const errorText = await orderResponse.text();
            console.error('[SEPTA-API] Order failed:', orderResponse.status, errorText);
            return { success: false, error: `Order failed: ${orderResponse.status} - ${errorText}` };
        }

    } catch (e) {
        console.error('[SEPTA-API] Add funds exception:', e);
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}


function parseJwt(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch {
    return null;
  }
}

function extractUserIdFromJwt(token: string): string | null {
  if (!token) return null;
  const payload = parseJwt(token);
  if (!payload) return null;
  
  // Look for alphanumeric strings that look like IDs
  if (payload.contact_id && typeof payload.contact_id === 'string') return payload.contact_id;
  if (payload.sub && typeof payload.sub === 'string' && payload.sub.length > 10) return payload.sub;
  if (payload.userId && typeof payload.userId === 'string' && payload.userId.length > 10) return payload.userId;
  if (payload.user_id && typeof payload.user_id === 'string' && payload.user_id.length > 10) return payload.user_id;

  return null;
}

/**
 * Recursively find a likely User ID (string, length 10-20) in an object
 */
function findStringId(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;
  
  // High priority keys
  const priorityKeys = ['contact_id', 'user_id', 'userId', 'publicId', 'code', 'key'];
  for (const key of priorityKeys) {
    if (obj[key] && typeof obj[key] === 'string' && obj[key].length > 10 && obj[key].length < 30) {
      return obj[key];
    }
  }

  // Deep search
  for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // If it looks like an ID
        if (key.toLowerCase().includes('id') && obj[key].length > 10 && obj[key].length < 30 && !obj[key].includes(' ')) {
          return obj[key];
        }
      } else if (typeof obj[key] === 'object') {
        const found = findStringId(obj[key]);
        if (found) return found;
      }
  }
  return null;
}

async function fetchUserProfile(token: string, cookies: string): Promise<{id: string | null, data: any}> {
  const headers = {
    ...COMMON_HEADERS,
    'Cookie': cookies,
    'X-Authorization': `Bearer ${token}`,
  };

  const endpoints = [
    `${SEPTA_API_BASE}/indv_users/profile`,
    `${SEPTA_API_BASE}/users/current`,
    `${SEPTA_API_BASE}/account`,
    `${SEPTA_API_BASE}/auth/user`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: 'GET', headers });
      if (res.ok) {
        const data = await res.json();
        const id = findStringId(data);
        if (id) {
            return { id, data };
        }
        return { id: null, data };
      }
    } catch (e) { 
        // Silent fail
    }
  }
  return { id: null, data: null };
}

export function formatSeptaData(apiData: any) {
  // Safety check: Handle null/undefined data
  if (!apiData) {
      return { 
          balance: 0, 
          cardNumber: null, 
          pass: null, 
          lastUpdated: new Date().toISOString(), 
          transactions: [],
          raw: null 
      };
  }

  // Handle array response (it's an array of cards)
  let card = apiData;
  
  // Check for our wrapper
  if (apiData.cards && Array.isArray(apiData.cards)) {
      card = apiData.cards.find((c: any) => c.status === 'Active') || apiData.cards[0];
  } else if (Array.isArray(apiData)) {
    if (apiData.length === 0) {
        return { 
            balance: 0, 
            cardNumber: null, 
            pass: null, 
            lastUpdated: new Date().toISOString(), 
            transactions: [],
            raw: apiData 
        };
    }
    // Find the active card, or just take the first one
    card = apiData.find((c: any) => c.status === 'Active') || apiData[0];
  } else if (apiData.keycards && Array.isArray(apiData.keycards)) {
    // @ts-ignore
    card = apiData.keycards[0];
  }
  
  // Safety check: Ensure we have a card object
  if (!card) {
      return { 
          balance: 0, 
          cardNumber: null, 
          pass: null, 
          lastUpdated: new Date().toISOString(), 
          transactions: [],
          raw: apiData 
      };
  }

  // Map fields based on the structure provided by user
  // Structure: { balances: { travel_wallet_balance: 2.75 }, card_number: "...", products: [...] }
  
  const balance = card.balances?.travel_wallet_balance ?? 
                  card.travel_wallet_balance ?? 
                  card.balance ?? 
                  0;
                  
  const cardNumber = card.card_number ?? 
                     card.last_four ?? 
                     card.keycard_id ?? 
                     card.masked_card_number ?? 
                     null;

  // Extract pass name from products
  const pass = mapPass(card.products);

  // Map trips to transactions
  // Proposed Trip Structure from standard SEPTA API: { start_time: "...", amount: 2.00, route_name: "...", etc }
  // Map trips to transactions
  let rawTrips = apiData.trips;
  
  // Normalize rawTrips to be an array
  if (rawTrips) {
      if (!Array.isArray(rawTrips)) {
          // If it's an object, look for likely array properties
          if (Array.isArray(rawTrips.result)) rawTrips = rawTrips.result; // FOUND THIS!
          else if (Array.isArray(rawTrips.results)) rawTrips = rawTrips.results;
          else if (Array.isArray(rawTrips.trips)) rawTrips = rawTrips.trips;
          else if (Array.isArray(rawTrips.data)) rawTrips = rawTrips.data;
          else if (Array.isArray(rawTrips.history)) rawTrips = rawTrips.history;
          else rawTrips = []; // Could not find array
      }
  } else {
      rawTrips = [];
  }

  let transactions: any[] = [];
  if (rawTrips && Array.isArray(rawTrips)) {
      transactions = rawTrips.map((t: any) => {
          // 1. AMOUNT
          const amount = Math.abs(parseFloat(t.amount || t.fare_amount || t.debit_amount || t.cost || 0));
          
          // 2. DESCRIPTION
          let desc = 'Trip';
          if (t.entry_stop) desc = t.entry_stop; // Found in logs
          else if (t.stop_name) desc = t.stop_name;
          else if (t.location) desc = t.location;
          else if (t.route_name) desc = t.route_name;
          else if (t.description) desc = t.description;
          else if (t.agency) desc = `${t.agency} Trip`;
          
          // Add route info if available
          const route = t.entry_route || t.route_id || t.route_name;
          if (route && !desc.includes(route)) {
              desc = `${desc} (${route})`;
          }

          // 3. TIMESTAMP
          const timestamp = t.entry_time || t.start_time || t.transaction_date || t.date || t.timestamp || new Date().toISOString();

          return {
              id: t.trip_id ? String(t.trip_id) : (t.id || t.transit_id || Math.random().toString()),
              type: 'debit',
              amount: amount,
              description: desc,
              timestamp: timestamp,
          };
      });
  }

  return {
    balance,
    cardNumber: cardNumber ? cardNumber.replace(/\*/g, '') : null,
    pass,
    lastUpdated: new Date().toISOString(),
    transactions,
    paymentProfiles: (apiData.paymentProfiles || []).map((p: any) => ({
        payment_profile_id: p.payment_profile_id,
        description: p.credit_card_info?.card_type || p.payment_method || 'Credit Card',
        last_four: p.credit_card_info?.card_number?.slice(-4) || '****',
        card_type: p.credit_card_info?.card_type,
        payment_method_type: p.payment_method
    })),
    raw: apiData 
  };
}

function mapPass(products: any[]) {
  if (!products || !Array.isArray(products) || products.length === 0) return null;
  
  // Find a product that isn't just the wallet itself (unless that's all there is)
  const passProduct = products.find(p => 
    p.product_name && 
    !p.product_name.includes('Travel Wallet') && 
    (p.status === 'Active' || p.status === 'UPCOMING')
  );

  if (passProduct) return passProduct.product_name;
  return null; 
}

// Public Data Constants & Helpers (Restored)

export const SEPTA_ROUTES = [
  // Subway
  {
    routeId: 'MFL',
    routeShortName: 'MFL',
    routeLongName: 'Market-Frankford Line',
    routeType: 'subway',
    directions: [
      { directionId: 0, directionName: 'Westbound', destinationName: '69th Street' },
      { directionId: 1, directionName: 'Eastbound', destinationName: 'Frankford' }
    ]
  },
  {
    routeId: 'BSL',
    routeShortName: 'BSL',
    routeLongName: 'Broad Street Line',
    routeType: 'subway',
    directions: [
      { directionId: 0, directionName: 'Southbound', destinationName: 'NRG Station' },
      { directionId: 1, directionName: 'Northbound', destinationName: 'Fern Rock' }
    ]
  },
  // Trolley
  {
    routeId: '10',
    routeShortName: '10',
    routeLongName: '13th-Market to 63rd-Malvern',
    routeType: 'trolley',
    directions: [
      { directionId: 0, directionName: 'Westbound', destinationName: '63rd-Malvern' },
      { directionId: 1, directionName: 'Eastbound', destinationName: '13th-Market' }
    ]
  },
  {
    routeId: '11',
    routeShortName: '11',
    routeLongName: '13th-Market to Darby Trans Ctr',
    routeType: 'trolley',
    directions: [
      { directionId: 0, directionName: 'Westbound', destinationName: 'Darby Trans Ctr' },
      { directionId: 1, directionName: 'Eastbound', destinationName: '13th-Market' }
    ]
  },
  {
    routeId: '13',
    routeShortName: '13',
    routeLongName: '13th-Market to Yeadon-Darby',
    routeType: 'trolley',
    directions: [
      { directionId: 0, directionName: 'Westbound', destinationName: 'Yeadon-Darby' },
      { directionId: 1, directionName: 'Eastbound', destinationName: '13th-Market' }
    ]
  },
  {
    routeId: '15',
    routeShortName: '15',
    routeLongName: '63rd-Girard to Richmond-Westmoreland',
    routeType: 'trolley',
    directions: [
      { directionId: 0, directionName: 'Westbound', destinationName: '63rd-Girard' },
      { directionId: 1, directionName: 'Eastbound', destinationName: 'Richmond-Westmoreland' }
    ]
  },
  {
    routeId: '34',
    routeShortName: '34',
    routeLongName: '13th-Market to 61st-Baltimore',
    routeType: 'trolley',
    directions: [
      { directionId: 0, directionName: 'Westbound', destinationName: '61st-Baltimore' },
      { directionId: 1, directionName: 'Eastbound', destinationName: '13th-Market' }
    ]
  },
  {
    routeId: '36',
    routeShortName: '36',
    routeLongName: '13th-Market to 80th-Eastwick',
    routeType: 'trolley',
    directions: [
      { directionId: 0, directionName: 'Westbound', destinationName: '80th-Eastwick' },
      { directionId: 1, directionName: 'Eastbound', destinationName: '13th-Market' }
    ]
  },
  // NHSL
  {
    routeId: 'NHSL',
    routeShortName: 'NHSL',
    routeLongName: 'Norristown High Speed Line',
    routeType: 'nhsl',
    directions: [
      { directionId: 0, directionName: 'Westbound', destinationName: 'Norristown' },
      { directionId: 1, directionName: 'Eastbound', destinationName: '69th Street' }
    ]
  },
  // Regional Rail
  {
    routeId: 'AIR',
    routeShortName: 'AIR',
    routeLongName: 'Airport Line',
    routeType: 'regional_rail',
    directions: [
      { directionId: 0, directionName: 'Outbound', destinationName: 'Airport' },
      { directionId: 1, directionName: 'Inbound', destinationName: 'Center City' }
    ]
  },
  {
    routeId: 'CHE',
    routeShortName: 'CHE',
    routeLongName: 'Chestnut Hill East Line',
    routeType: 'regional_rail',
    directions: [
      { directionId: 0, directionName: 'Outbound', destinationName: 'Chestnut Hill East' },
      { directionId: 1, directionName: 'Inbound', destinationName: 'Center City' }
    ]
  },
  {
    routeId: 'CHW',
    routeShortName: 'CHW',
    routeLongName: 'Chestnut Hill West Line',
    routeType: 'regional_rail',
    directions: [
      { directionId: 0, directionName: 'Outbound', destinationName: 'Chestnut Hill West' },
      { directionId: 1, directionName: 'Inbound', destinationName: 'Center City' }
    ]
  },
  {
    routeId: 'LAN',
    routeShortName: 'LAN',
    routeLongName: 'Lansdale/Doylestown Line',
    routeType: 'regional_rail',
    directions: [
      { directionId: 0, directionName: 'Outbound', destinationName: 'Doylestown' },
      { directionId: 1, directionName: 'Inbound', destinationName: 'Center City' }
    ]
  },
  {
    routeId: 'MED',
    routeShortName: 'MED',
    routeLongName: 'Media/Wawa Line',
    routeType: 'regional_rail',
    directions: [
      { directionId: 0, directionName: 'Outbound', destinationName: 'Wawa' },
      { directionId: 1, directionName: 'Inbound', destinationName: 'Center City' }
    ]
  },
  {
    routeId: 'PAO',
    routeShortName: 'PAO',
    routeLongName: 'Paoli/Thorndale Line',
    routeType: 'regional_rail',
    directions: [
      { directionId: 0, directionName: 'Outbound', destinationName: 'Thorndale' },
      { directionId: 1, directionName: 'Inbound', destinationName: 'Center City' }
    ]
  },
  {
    routeId: 'TRE',
    routeShortName: 'TRE',
    routeLongName: 'Trenton Line',
    routeType: 'regional_rail',
    directions: [
      { directionId: 0, directionName: 'Outbound', destinationName: 'Trenton' },
      { directionId: 1, directionName: 'Inbound', destinationName: 'Center City' }
    ]
  },
  {
    routeId: 'WAR',
    routeShortName: 'WAR',
    routeLongName: 'Warminster Line',
    routeType: 'regional_rail',
    directions: [
      { directionId: 0, directionName: 'Outbound', destinationName: 'Warminster' },
      { directionId: 1, directionName: 'Inbound', destinationName: 'Center City' }
    ]
  },
  {
    routeId: 'WIL',
    routeShortName: 'WIL',
    routeLongName: 'Wilmington/Newark Line',
    routeType: 'regional_rail',
    directions: [
      { directionId: 0, directionName: 'Outbound', destinationName: 'Newark' },
      { directionId: 1, directionName: 'Inbound', destinationName: 'Center City' }
    ]
  },
  {
    routeId: 'WTR',
    routeShortName: 'WTR',
    routeLongName: 'West Trenton Line',
    routeType: 'regional_rail',
    directions: [
      { directionId: 0, directionName: 'Outbound', destinationName: 'West Trenton' },
      { directionId: 1, directionName: 'Inbound', destinationName: 'Center City' }
    ]
  },
  // Bus Routes (Selection)
  {
    routeId: '17',
    routeShortName: '17',
    routeLongName: 'Front-Market to 20th-Johnston',
    routeType: 'bus',
    directions: [
      { directionId: 0, directionName: 'Southbound', destinationName: '20th-Johnston' },
      { directionId: 1, directionName: 'Northbound', destinationName: 'Front-Market' }
    ]
  },
  {
    routeId: '21',
    routeShortName: '21',
    routeLongName: 'Penns Landing to 69th Street TC',
    routeType: 'bus',
    directions: [
      { directionId: 0, directionName: 'Westbound', destinationName: '69th Street TC' },
      { directionId: 1, directionName: 'Eastbound', destinationName: 'Penns Landing' }
    ]
  },
  {
    routeId: '23',
    routeShortName: '23',
    routeLongName: 'Chestnut Hill to Broad-Oregon',
    routeType: 'bus',
    directions: [
      { directionId: 0, directionName: 'Southbound', destinationName: 'Broad-Oregon' },
      { directionId: 1, directionName: 'Northbound', destinationName: 'Chestnut Hill' }
    ]
  },
  {
    routeId: '33',
    routeShortName: '33',
    routeLongName: 'Penns Landing to 23th-Venango',
    routeType: 'bus',
    directions: [
      { directionId: 0, directionName: 'Northbound', destinationName: '23th-Venango' },
      { directionId: 1, directionName: 'Southbound', destinationName: 'Penns Landing' }
    ]
  },
  {
    routeId: '42',
    routeShortName: '42',
    routeLongName: 'Penns Landing to Wycombe',
    routeType: 'bus',
    directions: [
      { directionId: 0, directionName: 'Westbound', destinationName: 'Wycombe' },
      { directionId: 1, directionName: 'Eastbound', destinationName: 'Penns Landing' }
    ]
  },
  {
    routeId: '47',
    routeShortName: '47',
    routeLongName: 'Whitman Plaza to 5th-Godfrey',
    routeType: 'bus',
    directions: [
      { directionId: 0, directionName: 'Northbound', destinationName: '5th-Godfrey' },
      { directionId: 1, directionName: 'Southbound', destinationName: 'Whitman Plaza' }
    ]
  }
];

export const SAMPLE_STOPS = [
  { stopId: '20658', stopName: '15th St Station - MFL', lat: 39.9522, lng: -75.1654, routes: ['MFL', '10', '11', '13', '34', '36'] },
  { stopId: '20659', stopName: 'City Hall Station - BSL', lat: 39.9529, lng: -75.1636, routes: ['BSL', 'B-Ridge'] },
  { stopId: '136', stopName: 'Jefferson Station', lat: 39.9525, lng: -75.1581, routes: ['regional_rail'] },
  { stopId: '137', stopName: 'Suburban Station', lat: 39.9538, lng: -75.1678, routes: ['regional_rail'] },
  { stopId: '20', stopName: '30th St Station', lat: 39.9554, lng: -75.1819, routes: ['MFL', 'regional_rail', 'trolley', '9', '30', '31', '44', '62', '124', '125'] },
];

export function getNearbyStops(lat: number, lng: number, radiusMeters: number = 800) {
    // Return sample stops for now since we don't have geospatial DB
    return SAMPLE_STOPS.map(s => ({
        ...s,
        distanceMeters: Math.random() * 500,
        distanceText: '0.2 mi'
    }));
}

export async function getRealTimeArrivals(stopId: string) {
    // Return empty array to prevent crashes
    return {
        data: [],
        error: null,
        isStale: false,
        lastUpdated: new Date().toISOString()
    };
}

export async function getAlerts() {
    return {
        data: [],
        error: null,
        isStale: false,
        lastUpdated: new Date().toISOString()
    };
}

export function getRouteById(routeId: string) {
    if (!routeId) return null;
    return SEPTA_ROUTES.find(r => r.routeId.toLowerCase() === routeId.toLowerCase()) || null;
}

export async function getRouteAlerts(routeId: string) {
    return {
        data: [],
        error: null,
        isStale: false,
        lastUpdated: new Date().toISOString()
    };
}

export async function getTransitView(routeId: string) {
    return {
        data: [],
        error: null,
        isStale: false,
        lastUpdated: new Date().toISOString()
    };
}

export function getStopById(stopId: string) {
    if (!stopId) return null;
    return SAMPLE_STOPS.find(s => s.stopId === stopId) || null;
}

export function searchStopsAndRoutes(query: string) {
  if (!query) return [];
  const q = query.toLowerCase();
  
  const matchingRoutes = SEPTA_ROUTES.filter(r => 
    r.routeId.toLowerCase().includes(q) || 
    r.routeShortName.toLowerCase().includes(q) || 
    r.routeLongName.toLowerCase().includes(q)
  );

  const matchingStops = SAMPLE_STOPS.filter(s => 
    s.stopId.includes(q) || 
    s.stopName.toLowerCase().includes(q)
  );

  return [...matchingRoutes, ...matchingStops];
}


