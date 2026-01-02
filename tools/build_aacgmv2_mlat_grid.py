# tools/build_aacgmv2_mlat_grid.py
# Build global 1°×1° AACGMv2 magnetic-latitude grid (mlat only).
#
# Output:
#   data/aacgmv2_mlat_1deg_110km_2026-01-01_i16.bin  (int16, little-endian, mlat*100)
#   data/aacgmv2_mlat_1deg_110km_2026-01-01_meta.json

import os, json
from datetime import datetime, timezone
import numpy as np
import aacgmv2

ALT_KM = 110
# 固定一个“参考日期”保证可复现（你也可以改成今天）
DT = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

# Grid definition:
# lat: -90..90  (181)
# lon: -180..179 (360)
lats = np.arange(-90, 91, 1, dtype=np.float64)
lons = np.arange(-180, 180, 1, dtype=np.float64)

out = np.empty((len(lats), len(lons)), dtype=np.int16)

def clamp_i16(x: int) -> int:
  if x < -32768: return -32768
  if x > 32767: return 32767
  return x

for i, lat in enumerate(lats):
  for j, lon in enumerate(lons):
    mlat, mlon, mlt = aacgmv2.get_aacgm_coord(float(lat), float(lon), ALT_KM, DT)
    # store mlat only, scaled by 100 (0.01° resolution)
    v = int(np.round(float(mlat) * 100.0))
    out[i, j] = np.int16(clamp_i16(v))

os.makedirs("data", exist_ok=True)
bin_path = "data/aacgmv2_mlat_1deg_110km_2026-01-01_i16.bin"
meta_path = "data/aacgmv2_mlat_1deg_110km_2026-01-01_meta.json"

# write binary (little-endian int16)
out.astype("<i2").tofile(bin_path)

meta = {
  "type": "AACGMv2_mlat_grid",
  "alt_km": ALT_KM,
  "utc": DT.isoformat(),
  "lat_start": -90,
  "lat_step": 1,
  "lat_count": 181,
  "lon_start": -180,
  "lon_step": 1,
  "lon_count": 360,
  "scale": 100,
  "dtype": "int16_le",
  "indexing": "idx = (lat+90)*360 + ((lon+180)%360), lon uses floor to 1deg bin",
}
with open(meta_path, "w", encoding="utf-8") as f:
  json.dump(meta, f, ensure_ascii=False, indent=2)

print("✅ wrote:", bin_path)
print("✅ wrote:", meta_path)
print("size bytes:", os.path.getsize(bin_path))
