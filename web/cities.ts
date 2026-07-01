/**
 * A small curated set of world cities for the birthplace picker. Each entry carries the
 * longitude (east positive) and IANA timezone the engine needs. This is intentionally a
 * starter list; a production build would swap in a full GeoNames-backed autocomplete.
 */
export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
}

export const CITIES: City[] = [
  // East Asia
  { name: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978, tz: "Asia/Seoul" },
  { name: "Busan", country: "South Korea", lat: 35.1796, lon: 129.0756, tz: "Asia/Seoul" },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
  { name: "Osaka", country: "Japan", lat: 34.6937, lon: 135.5023, tz: "Asia/Tokyo" },
  { name: "Beijing", country: "China", lat: 39.9042, lon: 116.4074, tz: "Asia/Shanghai" },
  { name: "Shanghai", country: "China", lat: 31.2304, lon: 121.4737, tz: "Asia/Shanghai" },
  { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lon: 114.1694, tz: "Asia/Hong_Kong" },
  { name: "Taipei", country: "Taiwan", lat: 25.033, lon: 121.5654, tz: "Asia/Taipei" },
  // South & Southeast Asia
  { name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198, tz: "Asia/Singapore" },
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018, tz: "Asia/Bangkok" },
  { name: "Jakarta", country: "Indonesia", lat: -6.2088, lon: 106.8456, tz: "Asia/Jakarta" },
  { name: "Manila", country: "Philippines", lat: 14.5995, lon: 120.9842, tz: "Asia/Manila" },
  { name: "Mumbai", country: "India", lat: 19.076, lon: 72.8777, tz: "Asia/Kolkata" },
  { name: "New Delhi", country: "India", lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" },
  { name: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai" },
  // Oceania
  { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
  { name: "Melbourne", country: "Australia", lat: -37.8136, lon: 144.9631, tz: "Australia/Melbourne" },
  { name: "Auckland", country: "New Zealand", lat: -36.8485, lon: 174.7633, tz: "Pacific/Auckland" },
  // Europe
  { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522, tz: "Europe/Paris" },
  { name: "Berlin", country: "Germany", lat: 52.52, lon: 13.405, tz: "Europe/Berlin" },
  { name: "Madrid", country: "Spain", lat: 40.4168, lon: -3.7038, tz: "Europe/Madrid" },
  { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964, tz: "Europe/Rome" },
  { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041, tz: "Europe/Amsterdam" },
  { name: "Moscow", country: "Russia", lat: 55.7558, lon: 37.6173, tz: "Europe/Moscow" },
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784, tz: "Europe/Istanbul" },
  // Africa & Middle East
  { name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357, tz: "Africa/Cairo" },
  { name: "Johannesburg", country: "South Africa", lat: -26.2041, lon: 28.0473, tz: "Africa/Johannesburg" },
  { name: "Lagos", country: "Nigeria", lat: 6.5244, lon: 3.3792, tz: "Africa/Lagos" },
  { name: "Tel Aviv", country: "Israel", lat: 32.0853, lon: 34.7818, tz: "Asia/Jerusalem" },
  // North America
  { name: "New York", country: "United States", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
  { name: "Los Angeles", country: "United States", lat: 34.0522, lon: -118.2437, tz: "America/Los_Angeles" },
  { name: "Chicago", country: "United States", lat: 41.8781, lon: -87.6298, tz: "America/Chicago" },
  { name: "San Francisco", country: "United States", lat: 37.7749, lon: -122.4194, tz: "America/Los_Angeles" },
  { name: "Denver", country: "United States", lat: 39.7392, lon: -104.9903, tz: "America/Denver" },
  { name: "Honolulu", country: "United States", lat: 21.3069, lon: -157.8583, tz: "Pacific/Honolulu" },
  { name: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832, tz: "America/Toronto" },
  { name: "Vancouver", country: "Canada", lat: 49.2827, lon: -123.1207, tz: "America/Vancouver" },
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332, tz: "America/Mexico_City" },
  // South America
  { name: "São Paulo", country: "Brazil", lat: -23.5505, lon: -46.6333, tz: "America/Sao_Paulo" },
  { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lon: -58.3816, tz: "America/Argentina/Buenos_Aires" },
  { name: "Lima", country: "Peru", lat: -12.0464, lon: -77.0428, tz: "America/Lima" },
  { name: "Bogotá", country: "Colombia", lat: 4.711, lon: -74.0721, tz: "America/Bogota" },
  { name: "Santiago", country: "Chile", lat: -33.4489, lon: -70.6693, tz: "America/Santiago" },
];
