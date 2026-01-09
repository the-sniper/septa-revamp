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
      } else {
        const errText = await walletResponse.text();
        console.error(`[SEPTA-API] Wallet fetch failed (${walletResponse.status}): ${errText}`);
        return {
            success: false,
            error: `Wallet fetch failed: ${walletResponse.status}`
        };
      }
    } else {
      console.error('[SEPTA-API] Could not find User ID to fetch wallet');
      return {
          success: false,
          error: 'Could not find User ID'
      };
    }

    return { 
      success: true, 
      data: walletData || loginData
    };

  } catch (error) {
    console.error('[SEPTA-API] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
          raw: null 
      };
  }

  // Handle array response (it's an array of cards)
  let card = apiData;
  if (Array.isArray(apiData)) {
    if (apiData.length === 0) {
        return { 
            balance: 0, 
            cardNumber: null, 
            pass: null, 
            lastUpdated: new Date().toISOString(), 
            raw: apiData 
        };
    }
    // Find the active card, or just take the first one
    card = apiData.find((c: any) => c.status === 'Active') || apiData[0];
  } else if (apiData.keycards && Array.isArray(apiData.keycards)) {
    card = apiData.keycards[0];
  }
  
  // Safety check: Ensure we have a card object
  if (!card) {
      return { 
          balance: 0, 
          cardNumber: null, 
          pass: null, 
          lastUpdated: new Date().toISOString(), 
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

  return {
    balance,
    cardNumber: cardNumber ? cardNumber.replace(/\*/g, '') : null, // Clean up masking if needed
    pass,
    lastUpdated: new Date().toISOString(),
    raw: apiData // Keep raw data for debugging if needed but UI won't use it
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
