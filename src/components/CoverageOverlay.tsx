import React from 'react';
import { Circle, Polygon } from 'react-native-maps';
import { CellTower, RADIO_COLORS } from '@/src/types';
import { useTowerCoverage } from '@/src/hooks/useTowerCoverage';

// Outer ring lightest fill, inner densest — map stays readable through all zones
const FILL_OPACITIES   = [0.07, 0.13, 0.20, 0.32];
// Each ring gets its own border: outer is bold, inner rings are subtle dividers
const STROKE_OPACITIES = [0.90, 0.30, 0.20, 0.10];
const STROKE_WIDTHS    = [2.5,  1.0,  0.8,  0.5];

function hexRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export default function CoverageOverlay({ tower }: { tower: CellTower }) {
  const coverage = useTowerCoverage(tower);
  const color = RADIO_COLORS[tower.radio];

  console.log('[CoverageOverlay] render — tower:', tower.cellid, 'coverage:', coverage ? `ready=${coverage.ready} rings=${coverage.rings.length}` : 'null');

  if (!coverage) return null;

  // Loading state: simple concentric circles as placeholder
  if (!coverage.ready) {
    return (
      <>
        {([1.0, 0.70, 0.45, 0.20] as const).map((frac, i) => (
          <Circle
            key={`cl${i}`}
            center={coverage.center}
            radius={coverage.radius * frac}
            fillColor={hexRgba(color, FILL_OPACITIES[i])}
            strokeColor={hexRgba(color, STROKE_OPACITIES[i])}
            strokeWidth={STROKE_WIDTHS[i]}
          />
        ))}
      </>
    );
  }

  // Terrain-aware polygons — viewshed-clipped rings
  return (
    <>
      {coverage.rings.map((ring, i) => {
        const si = Math.min(i, FILL_OPACITIES.length - 1);
        return (
          <Polygon
            key={`rg${i}`}
            coordinates={ring.coordinates}
            fillColor={hexRgba(color, FILL_OPACITIES[si])}
            strokeColor={hexRgba(color, STROKE_OPACITIES[si])}
            strokeWidth={STROKE_WIDTHS[si]}
          />
        );
      })}
    </>
  );
}
