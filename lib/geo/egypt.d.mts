export type NameAr = { ar: string; en: string };
export type PlaceOption = {
  kind: 'governorate' | 'city' | 'district';
  ar: string;
  en: string;
  governorate: NameAr;
  city?: NameAr;
  district?: NameAr;
  label: string;
  sub: string;
  hay: string;
};
export type GeoRegion = {
  governorate?: string; city?: string; district?: string;
  governorate_en?: string; city_en?: string; district_en?: string;
};
export const PLACES: PlaceOption[];
export const GOVERNORATE_COUNT: number;
export function normPlace(s: string): string;
export function searchPlaces(query: string, limit?: number): PlaceOption[];
export function regionFromPlace(p: PlaceOption): GeoRegion;
export function resolvePlace(r: { governorate?: string; city?: string; district?: string } | null | undefined): PlaceOption | null;
export function resolveRegion(r: { governorate?: string; city?: string; district?: string } | null | undefined): GeoRegion | null;
export function regionLabelAr(r: GeoRegion): string;
export function geocoderQuery(r: GeoRegion): string | null;
