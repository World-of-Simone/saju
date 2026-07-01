#!/usr/bin/env node
/**
 * Generate the birthplace-picker dataset from GeoNames (cities >= 15,000 people).
 *
 * Output: web/public/cities-data.json — a compact, population-sorted list carrying exactly
 * what the app needs: display name, an ASCII form for accent-insensitive search, region and
 * country names for disambiguation, the LONGITUDE (east positive) and IANA TIMEZONE the Saju
 * engine consumes. Longitude is the only geo input that affects the chart (true solar time);
 * latitude is intentionally omitted.
 *
 * Data © GeoNames (https://www.geonames.org/), licensed CC BY 4.0.
 *
 * Usage:  node scripts/gen_cities.mjs [--refresh]
 *   Downloads (and caches in the OS temp dir) three GeoNames files, then rebuilds the JSON.
 *   Pass --refresh to force a re-download.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "web", "public", "cities-data.json");
const CACHE = join(tmpdir(), "saju-geonames");
const BASE = "https://download.geonames.org/export/dump";
const refresh = process.argv.includes("--refresh");

mkdirSync(CACHE, { recursive: true });

function fetchFile(name) {
  const dest = join(CACHE, name);
  if (existsSync(dest) && !refresh) return dest;
  console.log(`downloading ${name} …`);
  execSync(`curl -sSf -o "${dest}" "${BASE}/${name}"`, { stdio: ["ignore", "ignore", "inherit"] });
  return dest;
}

// Country code -> country name (countryInfo.txt: col0 ISO, col4 name; '#' comments).
function loadCountries() {
  const m = new Map();
  for (const line of readFileSync(fetchFile("countryInfo.txt"), "utf-8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const c = line.split("\t");
    if (c[0] && c[4]) m.set(c[0], c[4]);
  }
  return m;
}

// "CC.admin1code" -> region name (admin1CodesASCII.txt: col0 key, col1 name).
function loadAdmin1() {
  const m = new Map();
  for (const line of readFileSync(fetchFile("admin1CodesASCII.txt"), "utf-8").split("\n")) {
    if (!line) continue;
    const c = line.split("\t");
    if (c[0] && c[1]) m.set(c[0], c[1]);
  }
  return m;
}

function main() {
  const countries = loadCountries();
  const admin1 = loadAdmin1();

  // cities15000.txt is delivered zipped; unzip into the cache.
  const zip = fetchFile("cities15000.zip");
  const txt = join(CACHE, "cities15000.txt");
  if (!existsSync(txt) || refresh) execSync(`unzip -o "${zip}" -d "${CACHE}" >/dev/null`);

  const rows = readFileSync(txt, "utf-8").split("\n");
  const out = [];
  for (const line of rows) {
    if (!line) continue;
    const c = line.split("\t");
    const name = c[1];
    const ascii = c[2] || c[1];
    const lat = c[4], lon = c[5];
    const cc = c[8];
    const admin1code = c[10];
    const pop = parseInt(c[14] || "0", 10);
    const tz = c[17];
    if (!name || !lon || !tz) continue; // need a longitude + timezone to be useful

    const region = admin1.get(`${cc}.${admin1code}`) || "";
    const country = countries.get(cc) || cc;
    out.push({ name, ascii, region, country, lon: Math.round(parseFloat(lon) * 1e4) / 1e4, tz, pop });
  }

  // Most-populous first, so a search for "London" ranks London, UK above London, Ontario.
  out.sort((a, b) => b.pop - a.pop);

  const cities = out.map((c) => [c.name, c.ascii, c.region, c.country, c.lon, c.tz]);
  const payload = {
    attribution: "City data \u00a9 GeoNames (CC BY 4.0) — https://www.geonames.org/",
    source: "GeoNames cities15000 (population \u2265 15,000 or national capital)",
    generated: new Date().toISOString().slice(0, 10),
    fields: ["name", "ascii", "region", "country", "lon", "tz"],
    cities,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload));
  const kb = (Buffer.byteLength(JSON.stringify(payload)) / 1024).toFixed(0);
  console.log(`wrote ${cities.length} cities -> ${OUT} (${kb} KB)`);
}

main();
