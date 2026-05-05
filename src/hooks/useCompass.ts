import { Magnetometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

/**
 * Returns the device's magnetic heading in degrees (0–360, 0 = North).
 * Returns null if the magnetometer is unavailable.
 *
 * Pass `enabled=false` to skip subscribing — this defers the iOS Motion
 * permission prompt until the compass is actually needed (e.g. tower detail).
 */
export function useCompass(enabled: boolean = true): number | null {
  const [heading, setHeading] = useState<number | null>(null);
  const subRef = useRef<ReturnType<typeof Magnetometer.addListener> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    Magnetometer.isAvailableAsync().then((available) => {
      if (!available || !active) return;
      Magnetometer.setUpdateInterval(250);
      subRef.current = Magnetometer.addListener(({ x, y }) => {
        // atan2 gives CCW from East; convert to CW from North
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = (angle + 360) % 360;
        setHeading(Math.round(angle));
      });
    });

    return () => {
      active = false;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [enabled]);

  return heading;
}
