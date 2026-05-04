import { CellTower } from '@/src/types';

const PREMIUM_DIVISOR = 5;

function towerHash(tower: CellTower): number {
  let h = (tower.mcc * 31 + tower.mnc) >>> 0;
  h = (h * 31 + tower.lac) >>> 0;
  h = (h * 31 + tower.cellid) >>> 0;
  return h;
}

export function isPremiumOnlyTower(tower: CellTower): boolean {
  return towerHash(tower) % PREMIUM_DIVISOR === 0;
}
