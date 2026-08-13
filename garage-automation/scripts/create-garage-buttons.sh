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

HA_URL="${HA_URL:-http://homeassistant.local:8123}"

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

echo "Home Assistant: $HA_URL"
echo "Target cover:   $COVER"
echo

# --- Verify we can reach HA and the token works ------------------------------
echo "Checking connection..."
if ! curl -sf -H "Authorization: Bearer $HA_TOKEN" "$HA_URL/api/" >/dev/null; then
  echo "ERROR: Could not reach Home Assistant at $HA_URL, or the token was rejected."
  echo "  - On the same network as HA?"
  echo "  - Try the IP address instead of homeassistant.local via HA_URL."
  exit 1
fi
echo "  Connected."

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
