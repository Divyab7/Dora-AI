#!/usr/bin/env bash
# Smoke + flow tests for Dora-AI dev server
set -euo pipefail

PORT="${1:-3002}"
BASE="http://localhost:${PORT}"

echo "=== Dora-AI smoke tests on ${BASE} ==="

fail() { echo "FAIL: $1"; exit 1; }
pass() { echo "PASS: $1"; }

for i in $(seq 1 30); do
  if curl -sf "${BASE}/scan" >/dev/null 2>&1; then break; fi
  sleep 1
done

# ── Pages ──
for path in /agent /scan /verify /connect /cart /home /wallet; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${path}")
  [[ "$CODE" == "200" ]] || fail "GET ${path} returned ${CODE}"
  pass "GET ${path} (${CODE})"
done

# ── CSS ──
HTML=$(curl -sf "${BASE}/scan") || fail "GET /scan unreachable"
CSS_HREF=$(echo "$HTML" | grep -oE '/_next/static/css/app/layout\.css[^"]*' | head -1)
[[ -n "$CSS_HREF" ]] || fail "Missing CSS href"
CSS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${CSS_HREF}")
[[ "$CSS_CODE" == "200" ]] || fail "CSS HTTP ${CSS_CODE}"
pass "CSS bundle (${CSS_CODE})"

# ── API: missing input ──
API_RESP=$(curl -s -X POST "${BASE}/api/vision/analyze" -H "Content-Type: application/json" -d '{}')
echo "$API_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['success']==False"
pass "POST /api/vision/analyze validation"

# ── API: vision quality (real product photo) ──
IMG_B64=$(curl -sfL "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" | base64 | tr -d '\n')
VISION_RESP=$(curl -s -X POST "${BASE}/api/vision/analyze" \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\":\"${IMG_B64}\",\"mimeType\":\"image/jpeg\"}")
echo "$VISION_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('success'), d.get('error', {})
data = d['data']
conf = data.get('confidence', 0)
model = data.get('modelUsed', '')
print(f'  vision confidence: {conf:.0%}, model: {model}, product: {data.get(\"identifiedProductName\",\"?\")[:50]}')
assert conf > 0.35, f'Confidence too low ({conf:.0%}) — still using weak fallback'
assert 'blip' not in model.lower(), f'Still on BLIP fallback: {model}'
"
pass "POST /api/vision/analyze product image (confidence > 35%, not BLIP)"

# ── API: search (retry once if route still compiling) ──
SEARCH_BODY='{"embedding":[0.1,0.2,0.3],"analysis":{"gpt4vDescription":"Nike red sneakers","detectedBrand":"Nike","detectedCategory":"shoes","confidence":0.8,"embedding":[],"labels":[]}}'
SEARCH_RESP=""
for attempt in 1 2 3; do
  SEARCH_RESP=$(curl -s -w "\n__HTTP__%{http_code}" -X POST "${BASE}/api/vision/search" \
    -H "Content-Type: application/json" -d "${SEARCH_BODY}")
  HTTP=$(echo "$SEARCH_RESP" | grep '__HTTP__' | sed 's/.*__HTTP__//')
  SEARCH_RESP=$(echo "$SEARCH_RESP" | grep -v '__HTTP__')
  [[ "$HTTP" == "200" ]] && break
  sleep 2
done
echo "$SEARCH_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['success']; assert len(d['data']['matches'])>0"
pass "POST /api/vision/search"

# ── API: YouTube URL ──
YT_RESP=$(curl -s -X POST "${BASE}/api/vision/analyze" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}')
echo "$YT_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
assert d.get('success'), d.get('error')
print('  youtube confidence:', d['data'].get('confidence'))
"
pass "POST /api/vision/analyze YouTube URL"

# ── API: agent chat (needs GEMINI_API_KEY or OPENAI_API_KEY in .env.local) ──
AGENT_RESP=$(curl -s -X POST "${BASE}/api/agent/chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in one short sentence."}],"country":"US","searchUnlocked":false}')
echo "$AGENT_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if not d.get('success'):
  err = d.get('error', '')
  if 'GEMINI_API_KEY' in err or 'OPENAI_API_KEY' in err or 'No LLM' in err:
    print('  SKIP agent chat (no LLM key configured)')
    sys.exit(0)
  raise AssertionError(err)
assert d.get('text'), 'missing agent reply text'
print('  agent reply:', d['text'][:80])
"
pass "POST /api/agent/chat"

echo ""
echo "=== All tests passed on port ${PORT} ==="
