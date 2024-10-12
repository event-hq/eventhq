#!/bin/sh
# wait-for-it.sh script (sh version)

host="$1"
port="$2"
timeout="${WAIT_TIMEOUT:-30}"

shift 2

while ! nc -z "$host" "$port"; do
  echo "Waiting for $host:$port..."
  sleep 1
  timeout=$((timeout-1))
  if [ "$timeout" -le 0 ]; then
    echo "Error: Timeout reached"
    exit 1
  fi
done

echo "$host:$port is available!"
exec "$@"