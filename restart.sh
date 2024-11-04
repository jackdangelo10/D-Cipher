#!/bin/bash

# Load the environment variables if .env exists
if [[ -f ".env" ]]; then
    source .env
fi

# Function to terminate background processes if they are running
terminate_processes() {
    pkill -f "ngrok http" 2>/dev/null
    pkill -f "node.*server\.js" 2>/dev/null
}

terminate_processes

# Start ngrok if it's not already running
echo "Starting ngrok for secure tunnel..."
nohup ngrok http 3000 &>/dev/null &
sleep 2 # Wait for ngrok to fully start

# Update the ngrok URL in .env
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

if [[ -z "$NGROK_URL" ]]; then
    echo "Failed to retrieve ngrok URL. Exiting restart."
    exit 1
fi

# Update .env with the new URL
sed -i '' -e "/^BACKEND_NGROK_URL=/d" .env
echo "BACKEND_NGROK_URL=${NGROK_URL}" >> .env
echo "New backend URL: $NGROK_URL"

# Start the Node.js server
echo "Starting the Node.js server..."
node server.js & SERVER_PID=$!

