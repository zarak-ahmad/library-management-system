#!/bin/sh
set -e

echo "Waiting for MongoDB..."
until node -e "
const net = require('net');
const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/lms';
const host = uri.includes('@') ? uri.split('@')[1].split('/')[0].split(':')[0] : uri.replace('mongodb://','').split('/')[0].split(':')[0];
const port = parseInt((uri.match(/:(\d+)/) || [,'27017'])[1], 10);
const socket = net.createConnection({ host, port }, () => { socket.end(); process.exit(0); });
socket.on('error', () => process.exit(1));
" 2>/dev/null; do
  sleep 2
done

echo "MongoDB is ready"

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "Running database seed..."
  node dist/seeds/run.js || echo "Seed skipped or already applied"
fi

echo "Starting API server..."
exec node dist/server.js
