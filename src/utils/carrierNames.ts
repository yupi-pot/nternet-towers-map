// MCC-MNC → Carrier name + brand color lookup
// Key format: 'MCC-MNC' (MNC as plain number, no padding)

interface CarrierInfo { name: string; color: string | null }

const CARRIERS: Record<string, CarrierInfo> = {
  // ── United States ─────────────────────────────────────────────────────────
  '310-260': { name: 'T-Mobile',            color: '#E20074' },
  '310-240': { name: 'T-Mobile',            color: '#E20074' },
  '310-490': { name: 'T-Mobile',            color: '#E20074' },
  '310-660': { name: 'T-Mobile',            color: '#E20074' },
  '311-882': { name: 'T-Mobile',            color: '#E20074' },
  '311-883': { name: 'T-Mobile',            color: '#E20074' },
  '311-884': { name: 'T-Mobile',            color: '#E20074' },
  '311-885': { name: 'T-Mobile',            color: '#E20074' },
  '311-886': { name: 'T-Mobile',            color: '#E20074' },
  '311-887': { name: 'T-Mobile',            color: '#E20074' },
  '312-530': { name: 'T-Mobile (Sprint)',   color: '#E20074' },
  '310-410': { name: 'AT&T',               color: '#00A8E0' },
  '310-380': { name: 'AT&T',               color: '#00A8E0' },
  '310-30':  { name: 'AT&T (FirstNet)',     color: '#00A8E0' },
  '310-20':  { name: 'AT&T',               color: '#00A8E0' },
  '310-150': { name: 'AT&T (Cricket)',      color: '#00A8E0' },
  '310-170': { name: 'AT&T (Cricket)',      color: '#00A8E0' },
  '310-70':  { name: 'AT&T (Cricket)',      color: '#00A8E0' },
  '311-480': { name: 'Verizon',            color: '#CD040B' },
  '311-270': { name: 'Verizon',            color: '#CD040B' },
  '311-390': { name: 'Verizon',            color: '#CD040B' },
  '311-580': { name: 'Verizon',            color: '#CD040B' },
  '310-4':   { name: 'Verizon',            color: '#CD040B' },
  '316-10':  { name: 'Verizon',            color: '#CD040B' },
  '311-10':  { name: 'Verizon',            color: '#CD040B' },
  '311-90':  { name: 'US Cellular',        color: '#004B87' },
  '311-220': { name: 'US Cellular',        color: '#004B87' },
  '310-120': { name: 'Sprint',             color: '#FFCC00' },
  '312-190': { name: 'Dish (Boost)',       color: '#FF6900' },
  '313-100': { name: 'Dish',              color: '#FF6900' },

  // ── United Kingdom ────────────────────────────────────────────────────────
  '234-30': { name: 'EE',                  color: '#00B140' },
  '234-31': { name: 'EE',                  color: '#00B140' },
  '234-32': { name: 'EE',                  color: '#00B140' },
  '234-20': { name: 'Three UK',            color: '#EE2E24' },
  '234-10': { name: 'O2 UK',              color: '#003087' },
  '234-11': { name: 'O2 UK',              color: '#003087' },
  '234-58': { name: 'O2 UK',              color: '#003087' },
  '234-76': { name: 'Vodafone UK',         color: '#E60000' },
  '234-15': { name: 'Vodafone UK',         color: '#E60000' },
  '235-1':  { name: 'Vodafone UK',         color: '#E60000' },
  '235-30': { name: 'T-Mobile UK',         color: '#E20074' },

  // ── Canada ────────────────────────────────────────────────────────────────
  '302-720': { name: 'Rogers',             color: '#DA291C' },
  '302-370': { name: 'Fido (Rogers)',      color: '#DA291C' },
  '302-220': { name: 'Telus',             color: '#4B286D' },
  '302-880': { name: 'Telus',             color: '#4B286D' },
  '302-610': { name: 'Bell',              color: '#0047BB' },
  '302-651': { name: 'Bell',              color: '#0047BB' },
  '302-780': { name: 'SaskTel',           color: '#005EB8' },
  '302-500': { name: 'Videotron',          color: '#009A44' },
  '302-490': { name: 'Freedom Mobile',     color: '#6D2077' },

  // ── Australia ─────────────────────────────────────────────────────────────
  '505-1':  { name: 'Telstra',            color: '#006F8E' },
  '505-10': { name: 'Telstra',            color: '#006F8E' },
  '505-2':  { name: 'Optus',             color: '#FF8200' },
  '505-90': { name: 'Optus',             color: '#FF8200' },
  '505-3':  { name: 'Vodafone AU',        color: '#E60000' },
  '505-38': { name: 'Vodafone AU',        color: '#E60000' },

  // ── Germany ───────────────────────────────────────────────────────────────
  '262-1':  { name: 'Deutsche Telekom',   color: '#E20074' },
  '262-6':  { name: 'Deutsche Telekom',   color: '#E20074' },
  '262-78': { name: 'Deutsche Telekom',   color: '#E20074' },
  '262-2':  { name: 'Vodafone DE',        color: '#E60000' },
  '262-4':  { name: 'Vodafone DE',        color: '#E60000' },
  '262-3':  { name: 'O2 DE',             color: '#003087' },
  '262-7':  { name: 'O2 DE',             color: '#003087' },
  '262-8':  { name: 'O2 DE',             color: '#003087' },
  '262-11': { name: 'O2 DE',             color: '#003087' },
  '262-77': { name: 'E-Plus',            color: '#008B8B' },

  // ── France ────────────────────────────────────────────────────────────────
  '208-1':  { name: 'Orange FR',          color: '#FF6600' },
  '208-2':  { name: 'Orange FR',          color: '#FF6600' },
  '208-10': { name: 'SFR',               color: '#DA0000' },
  '208-11': { name: 'SFR',               color: '#DA0000' },
  '208-13': { name: 'SFR',               color: '#DA0000' },
  '208-20': { name: 'Bouygues',           color: '#009FE3' },
  '208-21': { name: 'Bouygues',           color: '#009FE3' },
  '208-88': { name: 'Free Mobile',        color: '#CF0E30' },
  '208-15': { name: 'Free Mobile',        color: '#CF0E30' },

  // ── Spain ─────────────────────────────────────────────────────────────────
  '214-1':  { name: 'Vodafone ES',        color: '#E60000' },
  '214-3':  { name: 'Orange ES',          color: '#FF6600' },
  '214-4':  { name: 'Yoigo',             color: '#00C853' },
  '214-5':  { name: 'Movistar ES',        color: '#019DF4' },
  '214-6':  { name: 'Vodafone ES',        color: '#E60000' },
  '214-7':  { name: 'Movistar ES',        color: '#019DF4' },
  '214-8':  { name: 'Euskaltel',          color: '#E30613' },
  '214-9':  { name: 'Orange ES',          color: '#FF6600' },
  '214-11': { name: 'Telecable',          color: '#005EB8' },
  '214-15': { name: 'BT España',          color: '#5514B4' },
  '214-16': { name: 'Movistar ES',        color: '#019DF4' },
  '214-18': { name: 'Vodafone ES',        color: '#E60000' },
  '214-19': { name: 'Simyo',             color: '#9B59B6'  },
  '214-20': { name: 'Fonyou',            color: null       },
  '214-21': { name: 'Rock Telecom',       color: null       },
  '214-22': { name: 'DigiMobil',          color: null       },
  '214-23': { name: 'Lycamobile ES',      color: '#E30613' },
  '214-24': { name: 'Eroski Mobile',      color: null       },
  '214-25': { name: 'Lebara ES',          color: '#7B2D8B' },
  '214-26': { name: 'Digi Spain',         color: '#FFCC00' },

  // ── Italy ─────────────────────────────────────────────────────────────────
  '222-1':  { name: 'TIM IT',            color: '#003087' },
  '222-6':  { name: 'Vodafone IT',        color: '#E60000' },
  '222-10': { name: 'Vodafone IT',        color: '#E60000' },
  '222-88': { name: 'Wind IT',            color: '#FF0000' },
  '222-99': { name: 'Three IT',           color: '#EE2E24' },

  // ── Netherlands ───────────────────────────────────────────────────────────
  '204-4':  { name: 'Vodafone NL',        color: '#E60000' },
  '204-8':  { name: 'KPN',               color: '#009900' },
  '204-16': { name: 'T-Mobile NL',        color: '#E20074' },
  '204-20': { name: 'T-Mobile NL',        color: '#E20074' },

  // ── Japan ─────────────────────────────────────────────────────────────────
  '440-10': { name: 'NTT Docomo',         color: '#E00034' },
  '440-20': { name: 'SoftBank',           color: '#FFFFFF' },
  '440-50': { name: 'KDDI au',            color: '#E87722' },
  '440-51': { name: 'KDDI au',            color: '#E87722' },
  '440-70': { name: 'KDDI au',            color: '#E87722' },
  '440-90': { name: 'SoftBank',           color: '#CC0000' },
  '440-0':  { name: 'eAccess',            color: null       },

  // ── South Korea ───────────────────────────────────────────────────────────
  '450-5':  { name: 'SKT',               color: '#E60012' },
  '450-2':  { name: 'KT',               color: '#BC1F2D' },
  '450-4':  { name: 'KT',               color: '#BC1F2D' },
  '450-6':  { name: 'LGU+',             color: '#E60097' },
  '450-8':  { name: 'LGU+',             color: '#E60097' },

  // ── India ─────────────────────────────────────────────────────────────────
  '404-20': { name: 'Airtel IN',          color: '#E40000' },
  '404-10': { name: 'Airtel IN',          color: '#E40000' },
  '404-45': { name: 'Airtel IN',          color: '#E40000' },
  '404-4':  { name: 'Idea IN',            color: '#E20074' },
  '404-22': { name: 'Idea IN',            color: '#E20074' },
  '405-840':{ name: 'Jio',               color: '#003087' },
  '404-50': { name: 'BSNL',              color: '#003087' },
  '405-0':  { name: 'Reliance',           color: null       },

  // ── Brazil ────────────────────────────────────────────────────────────────
  '724-6':  { name: 'Vivo BR',            color: '#660099' },
  '724-11': { name: 'Vivo BR',            color: '#660099' },
  '724-16': { name: 'Oi BR',             color: '#00A650' },
  '724-24': { name: 'Oi BR',             color: '#00A650' },
  '724-5':  { name: 'Claro BR',           color: '#DA291C' },
  '724-0':  { name: 'Nextel BR',          color: null       },
  '724-10': { name: 'TIM BR',             color: '#003087' },

  // ── Mexico ────────────────────────────────────────────────────────────────
  '334-20': { name: 'Telcel MX',          color: '#003087' },
  '334-30': { name: 'Movistar MX',        color: '#019DF4' },
  '334-50': { name: 'AT&T MX',           color: '#00A8E0' },

  // ── China ─────────────────────────────────────────────────────────────────
  '460-0':  { name: 'China Mobile',       color: '#009900' },
  '460-2':  { name: 'China Mobile',       color: '#009900' },
  '460-1':  { name: 'China Unicom',       color: '#003087' },
  '460-6':  { name: 'China Unicom',       color: '#003087' },
  '460-3':  { name: 'China Telecom',      color: '#DA291C' },
  '460-5':  { name: 'China Telecom',      color: '#DA291C' },

  // ── Sweden ────────────────────────────────────────────────────────────────
  '240-1':  { name: 'Telia SE',           color: '#7B5EA7' },
  '240-7':  { name: 'Tele2 SE',           color: '#0066CC' },
  '240-8':  { name: 'Telenor SE',         color: '#007AC9' },

  // ── Norway ────────────────────────────────────────────────────────────────
  '242-1':  { name: 'Telenor NO',         color: '#007AC9' },
  '242-2':  { name: 'Telia NO',           color: '#7B5EA7' },

  // ── Switzerland ───────────────────────────────────────────────────────────
  '228-1':  { name: 'Swisscom',           color: '#1781E3' },
  '228-2':  { name: 'Sunrise CH',         color: '#DA291C' },
  '228-3':  { name: 'Salt CH',            color: '#E60000' },
};

function lookupCarrier(mcc: number, mnc: number): CarrierInfo | undefined {
  const key = `${mcc}-${mnc}`;
  return CARRIERS[key];
}

export function getCarrierName(mcc: number, mnc: number): string {
  return lookupCarrier(mcc, mnc)?.name ?? `MCC ${mcc} · MNC ${mnc}`;
}

export function getCarrierColor(mcc: number, mnc: number): string | null {
  return lookupCarrier(mcc, mnc)?.color ?? null;
}

export function getCarrierBrand(mcc: number, mnc: number): string {
  const name = getCarrierName(mcc, mnc);
  if (name.startsWith('MCC ')) return 'Other';
  return name.replace(/\s+(US|UK|DE|FR|ES|IT|AU|BR|MX|NL|SE|NO|CH|IN|JP|KR)$/, '');
}

export function getCarrierGroup(mcc: number, mnc: number): string {
  const brand = getCarrierBrand(mcc, mnc);
  if (brand.includes('T-Mobile') || brand.includes('Sprint')) return 'T-Mobile';
  if (brand.includes('AT&T') || brand.includes('Cricket') || brand.includes('FirstNet')) return 'AT&T';
  if (brand.includes('Verizon')) return 'Verizon';
  if (brand === 'Other') return 'Other';
  return brand;
}
