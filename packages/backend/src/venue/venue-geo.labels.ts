export function resolveMetroLabel(input: {
  legacyMetro: string | null;
  stationName?: string | null;
}): string | null {
  const fromRef = input.stationName?.trim() ? input.stationName.trim() : '';
  if (fromRef) return fromRef;
  return input.legacyMetro?.trim() ? input.legacyMetro.trim() : null;
}

export function resolveDistrictLabel(input: {
  legacyDistrict: string | null;
  districtName?: string | null;
}): string | null {
  const fromRef = input.districtName?.trim() ? input.districtName.trim() : '';
  if (fromRef) return fromRef;
  return input.legacyDistrict?.trim() ? input.legacyDistrict.trim() : null;
}
