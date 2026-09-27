#!/bin/bash
# SereneTrack Forces - Resilient Tunnel Daemon with Auto-Reconnect

echo "Starting SereneTrack Resilient Localtunnel Daemon..."
while true; do
  npx localtunnel --port 3000 --subdomain thick-turkeys-invent
  EXIT_CODE=$?
  echo "[$(date)] Localtunnel exited with code $EXIT_CODE. Reconnecting in 3 seconds..."
  sleep 3
done
