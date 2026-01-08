// Official SEPTA color palette - used consistently across the entire platform
// Based on SEPTA's official branding guidelines

// Line-specific colors (official SEPTA colors)
export const SEPTA_LINE_COLORS: Record<string, { bg: string; text: string }> = {
  // Market-Frankford Line (Blue Line)
  MFL: { bg: '#0066CC', text: '#FFFFFF' },
  
  // Broad Street Line (Orange Line)  
  BSL: { bg: '#F37021', text: '#FFFFFF' },
  
  // Trolley Lines (Green)
  '10': { bg: '#00A550', text: '#FFFFFF' },
  '11': { bg: '#00A550', text: '#FFFFFF' },
  '13': { bg: '#00A550', text: '#FFFFFF' },
  '15': { bg: '#00A550', text: '#FFFFFF' },
  '34': { bg: '#00A550', text: '#FFFFFF' },
  '36': { bg: '#00A550', text: '#FFFFFF' },
  '101': { bg: '#00A550', text: '#FFFFFF' },
  '102': { bg: '#00A550', text: '#FFFFFF' },
  
  // Norristown High Speed Line (Purple)
  NHSL: { bg: '#9B2D9B', text: '#FFFFFF' },
  
  // Regional Rail (All lines use this burgundy/purple)
  AIR: { bg: '#91456C', text: '#FFFFFF' },
  CHE: { bg: '#91456C', text: '#FFFFFF' },
  CHW: { bg: '#91456C', text: '#FFFFFF' },
  LAN: { bg: '#91456C', text: '#FFFFFF' },
  MED: { bg: '#91456C', text: '#FFFFFF' },
  PAO: { bg: '#91456C', text: '#FFFFFF' },
  TRE: { bg: '#91456C', text: '#FFFFFF' },
  WAR: { bg: '#91456C', text: '#FFFFFF' },
  WIL: { bg: '#91456C', text: '#FFFFFF' },
  NOR: { bg: '#91456C', text: '#FFFFFF' },
  FOX: { bg: '#91456C', text: '#FFFFFF' },
  WTR: { bg: '#91456C', text: '#FFFFFF' },
  CYN: { bg: '#91456C', text: '#FFFFFF' },
  MNK: { bg: '#91456C', text: '#FFFFFF' },
  
  // LUCY (special bus)
  LUCY: { bg: '#9B59B6', text: '#FFFFFF' },
};

// Mode-based colors (fallback when specific line color not available)
export const SEPTA_MODE_COLORS: Record<string, { bg: string; text: string }> = {
  // Bus - SEPTA Blue
  bus: { bg: '#004F9F', text: '#FFFFFF' },
  BUS: { bg: '#004F9F', text: '#FFFFFF' },
  
  // Trolley - Green  
  trolley: { bg: '#00A550', text: '#FFFFFF' },
  TRAM: { bg: '#00A550', text: '#FFFFFF' },
  LIGHT_RAIL: { bg: '#00A550', text: '#FFFFFF' },
  
  // Subway - Use MFL blue as default
  subway: { bg: '#0066CC', text: '#FFFFFF' },
  SUBWAY: { bg: '#0066CC', text: '#FFFFFF' },
  METRO_RAIL: { bg: '#F37021', text: '#FFFFFF' }, // BSL orange for metro
  
  // Regional Rail - Burgundy/Purple
  regional_rail: { bg: '#91456C', text: '#FFFFFF' },
  HEAVY_RAIL: { bg: '#91456C', text: '#FFFFFF' },
  COMMUTER_TRAIN: { bg: '#91456C', text: '#FFFFFF' },
  
  // NHSL
  nhsl: { bg: '#9B2D9B', text: '#FFFFFF' },
  
  // Walking - Gray
  walking: { bg: '#6B7280', text: '#FFFFFF' },
  WALKING: { bg: '#6B7280', text: '#FFFFFF' },
  
  // Default fallback
  DEFAULT: { bg: '#6B7280', text: '#FFFFFF' },
};

// Get color for a specific route/line
export function getRouteColors(routeId?: string, routeType?: string): { bg: string; text: string } {
  // First try exact line match
  if (routeId && SEPTA_LINE_COLORS[routeId.toUpperCase()]) {
    return SEPTA_LINE_COLORS[routeId.toUpperCase()];
  }
  
  // Then try mode-based color
  if (routeType && SEPTA_MODE_COLORS[routeType]) {
    return SEPTA_MODE_COLORS[routeType];
  }
  
  // Check if routeId is a bus number (numeric)
  if (routeId && /^\d+$/.test(routeId)) {
    return SEPTA_MODE_COLORS.bus;
  }
  
  return SEPTA_MODE_COLORS.DEFAULT;
}

// Get color for Google Directions API transit types
export function getTransitTypeColors(type?: string, lineName?: string): { bg: string; text: string } {
  // Try to extract line identifier from name (e.g., "MFL", "BSL", "10")
  if (lineName) {
    const cleanName = lineName.replace(/\s*(Bus|Trolley|Train|Rail|Line)$/i, '').trim().toUpperCase();
    if (SEPTA_LINE_COLORS[cleanName]) {
      return SEPTA_LINE_COLORS[cleanName];
    }
    // Check for partial matches
    for (const [key, colors] of Object.entries(SEPTA_LINE_COLORS)) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        return colors;
      }
    }
  }
  
  // Fall back to type-based colors
  if (type && SEPTA_MODE_COLORS[type]) {
    return SEPTA_MODE_COLORS[type];
  }
  
  return SEPTA_MODE_COLORS.DEFAULT;
}

// CSS color variables for Tailwind usage
export const SEPTA_CSS_COLORS = {
  bus: 'bg-[#004F9F]',
  trolley: 'bg-[#00A550]',
  subwayMfl: 'bg-[#0066CC]',
  subwayBsl: 'bg-[#F37021]',
  rail: 'bg-[#91456C]',
  nhsl: 'bg-[#9B2D9B]',
  walking: 'bg-gray-500',
};

