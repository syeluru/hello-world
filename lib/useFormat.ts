"use client";

import { useMemo } from "react";
import { useSettings } from "./store";
import { fmtClock, fmtDistance, fmtVolume, fmtWeight } from "./util";

/** Unit-aware formatters bound to the current settings. */
export function useFormat() {
  const settings = useSettings();
  return useMemo(
    () => ({
      unit: settings.weightUnit,
      distUnit: settings.distanceUnit,
      weight: (kg: number, withUnit = true) => fmtWeight(kg, settings.weightUnit, withUnit),
      volume: (kg: number) => fmtVolume(kg, settings.weightUnit),
      distance: (m: number) => fmtDistance(m, settings.distanceUnit),
      clock: fmtClock,
    }),
    [settings.weightUnit, settings.distanceUnit]
  );
}
