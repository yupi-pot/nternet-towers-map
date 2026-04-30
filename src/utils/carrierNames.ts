import * as mccMncList from 'mcc-mnc-list';

// Build lookup at module load: key is `${mcc}-${mnc}` (mnc as plain integer, no padding)
const _map = new Map<string, { name: string; bands: string | null }>();

for (const entry of mccMncList.all()) {
  const key = `${entry.mcc}-${parseInt(entry.mnc, 10)}`;
  if (!_map.has(key)) {
    _map.set(key, {
      name: entry.brand || entry.operator,
      bands: entry.bands ?? null,
    });
  }
}

function lookup(mcc: number, mnc: number) {
  return _map.get(`${mcc}-${mnc}`);
}

export function getCarrierName(mcc: number, mnc: number): string {
  return lookup(mcc, mnc)?.name ?? `MCC ${mcc} · MNC ${mnc}`;
}

export function getCarrierBands(mcc: number, mnc: number): string | null {
  return lookup(mcc, mnc)?.bands ?? null;
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

// Preserved for future UI use — brand hex colors per carrier
export function getCarrierColor(_mcc: number, _mnc: number): string | null {
  return null;
}
