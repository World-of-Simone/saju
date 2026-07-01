#!/usr/bin/env python3
"""Generate BaZi/Saju reference data from lunar-python to validate the TS engine.

We emit, for a battery of solar datetimes (treated as local wall-clock time), the four
pillars in hanja, plus Ipchun (立春) instants per year. The TS test harness feeds the SAME
wall-clock times through the real engine using Asia/Shanghai + longitude 120 (so the net
true-solar-time correction is ~0, only the Equation of Time), and compares.
"""
import json
import os
from lunar_python import Solar

HERE = os.path.dirname(__file__)
OUT_DIR = os.path.join(HERE, "..", "tests", "reference")
os.makedirs(OUT_DIR, exist_ok=True)

# Datetimes chosen at the MIDDLE of a shichen (even hour) and mid-month (day 12) to stay
# away from hour/month boundaries, so a few minutes of Equation-of-Time cannot flip a pillar.
YEARS = [1921, 1948, 1955, 1968, 1972, 1984, 1990, 1999, 2000, 2008, 2016, 2024, 2030]
MONTHS = [1, 3, 5, 8, 11]
HOURS = [4, 8, 14, 20]  # middle of 寅, 辰, 未, 戌 shichen

cases = []
for y in YEARS:
    for m in MONTHS:
        for h in HOURS:
            s = Solar.fromYmdHms(y, m, 12, h, 0, 0)
            lunar = s.getLunar()
            ec = lunar.getEightChar()
            cases.append({
                "y": y, "m": m, "d": 12, "h": h, "mi": 0,
                "year": ec.getYear(),
                "month": ec.getMonth(),
                "day": ec.getDay(),
                "time": ec.getTime(),
            })

# Day-pillar calibration set at NOON (unambiguous date).
day_cases = []
for (y, m, d) in [
    (1900, 1, 1), (1924, 2, 4), (1950, 6, 15), (1984, 2, 2),
    (2000, 1, 1), (2020, 12, 31), (2024, 6, 1), (1936, 11, 20),
]:
    s = Solar.fromYmdHms(y, m, d, 12, 0, 0)
    lunar = s.getLunar()
    day_cases.append({"y": y, "m": m, "d": d, "dayGZ": lunar.getDayInGanZhi()})

# Ipchun instants per year (for solar-term accuracy check).
ipchun = []
for y in YEARS:
    s = Solar.fromYmdHms(y, 2, 1, 0, 0, 0)
    jieqi = s.getLunar().getJieQiTable()
    ip = jieqi["立春"]
    ipchun.append({
        "y": y,
        "iso": "%04d-%02d-%02dT%02d:%02d:%02d" % (
            ip.getYear(), ip.getMonth(), ip.getDay(),
            ip.getHour(), ip.getMinute(), ip.getSecond()),
    })

out = {"cases": cases, "dayCases": day_cases, "ipchun": ipchun}
path = os.path.join(OUT_DIR, "lunar_python.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("wrote %d pillar cases, %d day cases, %d ipchun -> %s" % (
    len(cases), len(day_cases), len(ipchun), os.path.relpath(path)))
