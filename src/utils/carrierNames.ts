// MCC-MNC → Carrier name lookup
// Covers major carriers worldwide. Key format: 'MCC-MNC' (MNC zero-padded to 2+ digits)

const CARRIERS: Record<string, string> = {
  // ── United States ─────────────────────────────────────────────────────────
  '310-260': 'T-Mobile',
  '310-240': 'T-Mobile',
  '310-490': 'T-Mobile',
  '310-660': 'T-Mobile',
  '311-882': 'T-Mobile',
  '311-883': 'T-Mobile',
  '311-884': 'T-Mobile',
  '311-885': 'T-Mobile',
  '311-886': 'T-Mobile',
  '311-887': 'T-Mobile',
  '312-530': 'T-Mobile (Sprint)',
  '310-410': 'AT&T',
  '310-380': 'AT&T',
  '310-030': 'AT&T (FirstNet)',
  '310-020': 'AT&T',
  '310-150': 'AT&T (Cricket)',
  '310-170': 'AT&T (Cricket)',
  '310-070': 'AT&T (Cricket)',
  '311-480': 'Verizon',
  '311-270': 'Verizon',
  '311-390': 'Verizon',
  '311-580': 'Verizon',
  '310-004': 'Verizon',
  '316-010': 'Verizon',
  '311-010': 'Verizon',
  '311-090': 'US Cellular',
  '311-220': 'US Cellular',
  '311-580-1': 'US Cellular',
  '310-120': 'Sprint',
  '312-190': 'Dish (Boost)',
  '313-100': 'Dish',

  // ── United Kingdom ────────────────────────────────────────────────────────
  '234-30': 'EE',
  '234-31': 'EE',
  '234-32': 'EE',
  '234-20': 'Three UK',
  '234-10': 'O2 UK',
  '234-11': 'O2 UK',
  '234-58': 'O2 UK',
  '234-76': 'Vodafone UK',
  '234-15': 'Vodafone UK',
  '235-01': 'Vodafone UK',
  '235-30': 'T-Mobile UK',

  // ── Canada ────────────────────────────────────────────────────────────────
  '302-720': 'Rogers',
  '302-370': 'Fido (Rogers)',
  '302-220': 'Telus',
  '302-880': 'Telus',
  '302-610': 'Bell',
  '302-651': 'Bell',
  '302-780': 'SaskTel',
  '302-500': 'Videotron',
  '302-490': 'Freedom Mobile',

  // ── Australia ─────────────────────────────────────────────────────────────
  '505-01': 'Telstra',
  '505-10': 'Telstra',
  '505-02': 'Optus',
  '505-90': 'Optus',
  '505-03': 'Vodafone AU',
  '505-38': 'Vodafone AU',

  // ── Germany ───────────────────────────────────────────────────────────────
  '262-01': 'T-Mobile DE',
  '262-06': 'T-Mobile DE',
  '262-78': 'T-Mobile DE',
  '262-02': 'Vodafone DE',
  '262-04': 'Vodafone DE',
  '262-03': 'O2 DE',
  '262-07': 'O2 DE',
  '262-08': 'O2 DE',
  '262-11': 'O2 DE',
  '262-77': 'E-Plus',

  // ── France ────────────────────────────────────────────────────────────────
  '208-01': 'Orange FR',
  '208-02': 'Orange FR',
  '208-10': 'SFR',
  '208-11': 'SFR',
  '208-13': 'SFR',
  '208-20': 'Bouygues',
  '208-21': 'Bouygues',
  '208-88': 'Free Mobile',
  '208-15': 'Free Mobile',

  // ── Spain ─────────────────────────────────────────────────────────────────
  '214-01': 'Vodafone ES',
  '214-03': 'Orange ES',
  '214-04': 'Yoigo',
  '214-07': 'Movistar ES',
  '214-08': 'Telefonica ES',

  // ── Italy ─────────────────────────────────────────────────────────────────
  '222-01': 'TIM IT',
  '222-06': 'Vodafone IT',
  '222-10': 'Vodafone IT',
  '222-88': 'Wind IT',
  '222-99': 'Three IT',

  // ── Netherlands ───────────────────────────────────────────────────────────
  '204-04': 'Vodafone NL',
  '204-08': 'KPN',
  '204-16': 'T-Mobile NL',

  // ── Japan ─────────────────────────────────────────────────────────────────
  '440-10': 'NTT Docomo',
  '440-20': 'SoftBank',
  '440-50': 'KDDI au',
  '440-51': 'KDDI au',
  '440-70': 'KDDI au',
  '440-90': 'SoftBank',
  '440-00': 'eAccess',

  // ── South Korea ───────────────────────────────────────────────────────────
  '450-05': 'SKT',
  '450-02': 'KT',
  '450-04': 'KT',
  '450-06': 'LGU+',
  '450-08': 'LGU+',

  // ── India ─────────────────────────────────────────────────────────────────
  '404-20': 'Airtel IN',
  '404-10': 'Airtel IN',
  '404-45': 'Airtel IN',
  '404-04': 'Idea IN',
  '404-22': 'Idea IN',
  '405-840': 'Jio',
  '404-50': 'BSNL',
  '405-00': 'Reliance',

  // ── Brazil ────────────────────────────────────────────────────────────────
  '724-06': 'Vivo BR',
  '724-11': 'Vivo BR',
  '724-16': 'Oi BR',
  '724-24': 'Oi BR',
  '724-05': 'Claro BR',
  '724-00': 'Nextel BR',
  '724-10': 'TIM BR',

  // ── Mexico ────────────────────────────────────────────────────────────────
  '334-020': 'Telcel MX',
  '334-030': 'Movistar MX',
  '334-050': 'AT&T MX',

  // ── China ─────────────────────────────────────────────────────────────────
  '460-00': 'China Mobile',
  '460-02': 'China Mobile',
  '460-01': 'China Unicom',
  '460-06': 'China Unicom',
  '460-03': 'China Telecom',
  '460-05': 'China Telecom',

  // ── Sweden ────────────────────────────────────────────────────────────────
  '240-01': 'Telia SE',
  '240-07': 'Tele2 SE',
  '240-08': 'Telenor SE',

  // ── Norway ────────────────────────────────────────────────────────────────
  '242-01': 'Telenor NO',
  '242-02': 'Telia NO',

  // ── Switzerland ───────────────────────────────────────────────────────────
  '228-01': 'Swisscom',
  '228-02': 'Sunrise CH',
  '228-03': 'Salt CH',

  // ── Netherlands ───────────────────────────────────────────────────────────
  '204-20': 'T-Mobile NL',
};

/**
 * Returns a human-readable carrier name for a given MCC/MNC pair.
 * Falls back to 'MCC-MNC' format if unknown.
 */
export function getCarrierName(mcc: number, mnc: number): string {
  const key = `${mcc}-${mnc}`;
  return CARRIERS[key] ?? `MCC ${mcc} · MNC ${mnc}`;
}

/**
 * Returns a short carrier brand for use in filter chips (strips country suffix).
 */
export function getCarrierBrand(mcc: number, mnc: number): string {
  const name = getCarrierName(mcc, mnc);
  // If it's an unknown MCC/MNC, return 'Other'
  if (name.startsWith('MCC ')) return 'Other';
  // Strip country suffix (e.g. 'T-Mobile DE' → 'T-Mobile')
  return name.replace(/\s+(US|UK|DE|FR|ES|IT|AU|BR|MX|NL|SE|NO|CH|IN|JP|KR)$/, '');
}

/**
 * Returns the broad carrier group for filtering (groups sub-brands).
 */
export function getCarrierGroup(mcc: number, mnc: number): string {
  const brand = getCarrierBrand(mcc, mnc);
  if (brand.includes('T-Mobile') || brand.includes('Sprint')) return 'T-Mobile';
  if (brand.includes('AT&T') || brand.includes('Cricket') || brand.includes('FirstNet')) return 'AT&T';
  if (brand.includes('Verizon')) return 'Verizon';
  if (brand === 'Other') return 'Other';
  return brand;
}
