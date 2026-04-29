import React from 'react';
import { Circle, Polygon } from 'react-native-maps';
import { CellTower, RADIO_COLORS } from '@/src/types';
import { useTowerCoverage } from '@/src/hooks/useTowerCoverage';

// Cumulative opacity builds toward center: outer=faint, inner=denser
const FILL_OPACITIES = [0.06, 0.09, 0.14, 0.22];
const STROKE_OPACITY = 0.45;

function hexRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export default function CoverageOverlay({ tower }: { tower: CellTower }) {
  const coverage = useTowerCoverage(tower);
  const color = RADIO_COLORS[tower.radio];

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
            strokeColor={i === 0 ? hexRgba(color, STROKE_OPACITY) : 'transparent'}
            strokeWidth={i === 0 ? 1.5 : 0}
          />
        ))}
      </>
    );
  }

  // Terrain-aware polygons — viewshed-clipped rings
  return (
    <>
      {coverage.rings.map((ring, i) => (
        <Polygon
          key={`rg${i}`}
          coordinates={ring.coordinates}
          fillColor={hexRgba(color, FILL_OPACITIES[i])}
          strokeColor={i === 0 ? hexRgba(color, STROKE_OPACITY) : 'transparent'}
          strokeWidth={i === 0 ? 1.5 : 0}
        />
      ))}
    </>
  );
}
