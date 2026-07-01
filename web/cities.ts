/**
 * Birthplace picker data. The full city list (~34k cities, GeoNames cities15000) lives in
 * web/public/cities-data.json and is fetched lazily the first time the birthplace field is
 * used, so it never slows the initial page load. Each city carries the LONGITUDE (east
 * positive) and IANA TIMEZONE the Saju engine needs; longitude is the only geo input that
 * affects the chart (true solar time), so latitude is intentionally not shipped.
 *
 * City data © GeoNames (CC BY 4.0) — https://www.geonames.org/
 */
export interface City {
  name: string;
  region: string; // admin1 (state/province), may be empty
  country: string;
  lon: number;
  tz: string; // IANA zone id
}

/** Internal shape with precomputed, accent-folded search keys. */
interface IndexedCity extends City {
  _n: string; // normalized display name
  _a: string; // normalized ASCII name (so "sao paulo" matches "São Paulo")
}

/** JSON tuple order, kept in sync with scripts/gen_cities.mjs `fields`. */
type Row = [name: string, ascii: string, region: string, country: string, lon: number, tz: string];

/** Fold accents and lowercase for forgiving matching. */
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

let loadPromise: Promise<IndexedCity[]> | null = null;

function ensureLoaded(): Promise<IndexedCity[]> {
  if (!loadPromise) {
    // BASE_URL is "/" in dev and "/saju/" in the GitHub Pages build, so this resolves in both.
    const url = `${import.meta.env.BASE_URL}cities-data.json`;
    loadPromise = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load city data (${r.status})`);
        return r.json() as Promise<{ cities: Row[] }>;
      })
      .then((data) =>
        data.cities.map(([name, ascii, region, country, lon, tz]) => ({
          name, region, country, lon, tz,
          _n: norm(name),
          _a: norm(ascii),
        }))
      )
      .catch((err) => {
        loadPromise = null; // allow a retry on the next keystroke
        throw err;
      });
  }
  return loadPromise;
}

/** Warm the dataset (e.g. on focus) so results are instant once the user types. */
export function warmCities(): void {
  void ensureLoaded().catch(() => {});
}

/**
 * Search the city list. Prefix matches rank first, then substring matches; within each group
 * the list is already population-sorted, so bigger cities surface first (London, UK before
 * London, Ontario). Resolves to at most `limit` results.
 */
export async function searchCities(query: string, limit = 8): Promise<City[]> {
  const q = norm(query.trim());
  if (!q) return [];
  const cities = await ensureLoaded();

  const prefix: City[] = [];
  const contains: City[] = [];
  for (const c of cities) {
    if (c._n.startsWith(q) || c._a.startsWith(q)) {
      prefix.push(c);
      if (prefix.length >= limit) break; // population-sorted: the earliest prefix hits are best
    } else if (contains.length < limit && (c._n.includes(q) || c._a.includes(q))) {
      contains.push(c);
    }
  }
  return [...prefix, ...contains].slice(0, limit);
}
