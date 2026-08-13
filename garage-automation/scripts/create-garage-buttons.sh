#!/usr/bin/env bash
# =============================================================================
# Creates the "Garage: Open" and "Garage: Close" button scripts in Home
# Assistant via the REST API — no clicking through the UI.
#
# Run this ON the machine that can reach Home Assistant (your MacBook).
#
# Setup (one time):
#   1. In Home Assistant: click your username (bottom-left) -> Security tab
#      -> scroll to "Long-lived access tokens" -> Create Token -> copy it.
#   2. export HA_TOKEN="paste-the-token-here"
#   3. ./create-garage-buttons.sh
#
# Optional: export HA_URL if your instance isn't at homeassistant.local:8123
#   export HA_URL="http://192.168.1.50:8123"
#
# Safe to re-run — it overwrites these two scripts and touches nothing else.
# =============================================================================
set -euo pipefail

if [[ -z "${HA_TOKEN:-}" ]]; then
  echo "ERROR: HA_TOKEN is not set."
  echo
  echo "In Home Assistant: your username (bottom-left) -> Security ->"
  echo "Long-lived access tokens -> Create Token, then:"
  echo '  export HA_TOKEN="your-token-here"'
  exit 1
fi

# The cover entity the buttons act on. Change if your ratgdo device is named
# something other than "garage-door".
COVER="${COVER:-cover.garage_door_door}"

echo "Target cover: $COVER"
echo

# --- Find Home Assistant -----------------------------------------------------
# Home Assistant does not always live on port 8123 — a reverse proxy, an add-on,
# or a custom http.server_port can put it on 80. Rather than making you guess,
# probe the usual addresses and use whichever actually answers the API.
#
# Probing with the token means one request settles both questions at once:
#   HTTP 200 -> right URL and the token is good
#   HTTP 401 -> right URL, bad token (stop and say so — trying more URLs is
#               pointless and would report a misleading "unreachable" error)
#   no reply -> wrong URL, keep looking
if [[ -n "${HA_URL:-}" ]]; then
  candidates=("${HA_URL%/}")
else
  candidates=(
    "http://homeassistant.local:8123"
    "http://homeassistant.local"
    "http://homeassistant:8123"
    "http://homeassistant"
    "http://localhost:8123"
  )
fi

FOUND_URL=""
echo "Looking for Home Assistant..."
for candidate in "${candidates[@]}"; do
  echo -n "  $candidate ... "
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 6 \
    -H "Authorization: Bearer $HA_TOKEN" "$candidate/api/" 2>/dev/null || true)

  case "$status" in
    200)
      echo "yes"
      FOUND_URL="$candidate"
      break
      ;;
    401|403)
      echo "found, but the token was rejected"
      echo
      echo "ERROR: Home Assistant is running at $candidate, but it will not"
      echo "accept this token (HTTP $status). The network is fine."
      echo
      echo "Usually one of:"
      echo "  - The token was truncated when copied. They are very long —"
      echo "    make sure the entire string is inside the quotes."
      echo "  - The token was revoked, or belongs to a different instance."
      echo "  - You copied a refresh token rather than a LONG-LIVED token."
      echo
      echo "Create a new one: your username (bottom-left) -> Security tab ->"
      echo "Long-lived access tokens -> Create Token."
      exit 1
      ;;
    *)
      echo "no answer"
      ;;
  esac
done

if [[ -z "$FOUND_URL" ]]; then
  echo
  echo "ERROR: Could not find Home Assistant at any of the usual addresses."
  echo
  echo "Open Home Assistant in a browser and look at the address bar. Whatever"
  echo "comes before the first single slash is the value to use — including the"
  echo "port if there is one. For example, if the browser shows"
  echo "http://homeassistant.local/profile/security then use:"
  echo
  echo "  export HA_URL=\"http://homeassistant.local\""
  echo "  $0"
  echo
  echo "If the browser cannot load it either, this is a networking problem:"
  echo "  1. Is the Home Assistant VM running in UTM?"
  echo "  2. Try: ping -c 2 homeassistant.local"
  echo "  3. Use the IP shown on the VM's console screen instead of the name."
  echo "  4. If the VM has no LAN address, its network is set to Shared (NAT)."
  echo "     Switch it to Bridged in UTM settings and reboot the VM."
  exit 1
fi

HA_URL="$FOUND_URL"
echo "Using: $HA_URL"

# --- Verify the garage cover actually exists ---------------------------------
if ! curl -sf -H "Authorization: Bearer $HA_TOKEN" \
     "$HA_URL/api/states/$COVER" >/dev/null; then
  echo
  echo "WARNING: $COVER does not exist yet."
  echo "The buttons will still be created, but won't do anything until the"
  echo "ratgdo is set up. Re-run with COVER=<your entity> to target another."
  echo
fi

# --- Helper: create/overwrite one script -------------------------------------
create_script() {
  local object_id="$1" payload="$2"
  echo -n "Creating script.$object_id ... "
  if curl -sf -X POST \
      -H "Authorization: Bearer $HA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$HA_URL/api/config/script/config/$object_id" >/dev/null; then
    echo "done"
  else
    echo "FAILED"
    exit 1
  fi
}

create_script "garage_open_now" "$(cat <<JSON
{
  "alias": "Garage: Open",
  "icon": "mdi:garage-open-variant",
  "description": "One-tap open. Safe to run when already open.",
  "mode": "single",
  "sequence": [
    {
      "action": "cover.open_cover",
      "target": { "entity_id": "$COVER" }
    }
  ]
}
JSON
)"

create_script "garage_close_now" "$(cat <<JSON
{
  "alias": "Garage: Close",
  "icon": "mdi:garage-variant",
  "description": "One-tap close.",
  "mode": "single",
  "sequence": [
    {
      "action": "cover.close_cover",
      "target": { "entity_id": "$COVER" }
    }
  ]
}
JSON
)"

echo
echo "Done. Two new entities exist:"
echo "  script.garage_open_now   -> \"Garage: Open\""
echo "  script.garage_close_now  -> \"Garage: Close\""
echo
echo "They are immediately available in the phone app's widget picker."
echo "No restart needed."
