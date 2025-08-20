set -euo pipefail

API="http://localhost:8000"
DAY=$(date -d "+3 days" +%F 2>/dev/null || gdate -d "+3 days" +%F)  # mac fallback uses gdate

echo "== Sanity: Docker"
docker compose ps | grep -q "shirel-beauty-db-1" && echo "✓ db container present" || echo "… (db will start on demand)"
docker compose ps | grep -q "shirel-beauty-api-1" && echo "✓ api container present" || echo "… (api will start on demand)"

echo "== Sanity: API up?"
code=$(curl -s -o /dev/null -w "%{http_code}" "$API/health")
test "$code" = "200" && echo "✓ /health 200" || (echo "✗ /health $code"; exit 1)

echo "== Sanity: services"
SERVICES_JSON=$(curl -s "$API/services")
echo "$SERVICES_JSON" | grep -q "Eyelashes" && echo "✓ Eyelashes" || echo "✗ Eyelashes missing"
echo "$SERVICES_JSON" | grep -q "Eyebrows"  && echo "✓ Eyebrows"  || echo "✗ Eyebrows missing"
echo "$SERVICES_JSON" | grep -q "Combo"     && echo "✓ Combo"     || echo "✗ Combo missing"

echo "== Sanity: availability for Combo (id=3) on $DAY"
AV_JSON=$(curl -s "$API/availability?service_id=3&date=$DAY")
echo "$AV_JSON" | grep -q '"slots":' && echo "✓ slots returned" || (echo "✗ no slots returned: $AV_JSON"; exit 1)

# Show first and last slot label
python3 - "$AV_JSON" <<'PY'
import json,sys
j=json.loads(sys.argv[1])
slots=j.get("slots",[])
if not slots: 
  print("✗ slots empty"); sys.exit(1)
print("First slot:", slots[0]["label"], slots[0]["start_iso"])
print(" Last slot:", slots[-1]["label"], slots[-1]["start_iso"])
PY

# Optional booking test (only if you already added POST /appointments)
echo "== Optional: booking test"
HAS_POST=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API/appointments" || echo 000)
if [ "$HAS_POST" != "404" ]; then
  START=$(python3 - "$AV_JSON" <<'PY'
import json,sys
j=json.loads(sys.argv[1]); print(j["slots"][0]["start_iso"])
PY
)
  echo "Booking start_iso=$START"
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/appointments" \
    -H "Content-Type: application/json" \
    -d "{\"service_id\":3,\"start_iso\":\"$START\",\"client_name\":\"Sanity\",\"client_phone\":\"0500000000\"}")
  echo "  first POST -> $code (expect 201 if implemented)"
  code2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/appointments" \
    -H "Content-Type: application/json" \
    -d "{\"service_id\":3,\"start_iso\":\"$START\",\"client_name\":\"Sanity\",\"client_phone\":\"0500000000\"}")
  echo "  second POST -> $code2 (expect 409 if conflict check works)"
else
  echo "Skipping booking; POST /appointments not present yet."
fi

echo "== Done"
