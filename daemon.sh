#!/bin/bash

# Path to the restart script and msmtp config file
RESTART_SCRIPT="./restart.sh"
MSMTP_CONFIG="$HOME/.msmtprc"

# Load BACKEND_NGROK_URL from .env
ENV_FILE=".env"
if [[ -f "$ENV_FILE" ]]; then
    BACKEND_NGROK_URL=$(grep '^BACKEND_NGROK_URL=' "$ENV_FILE" | sed 's/^BACKEND_NGROK_URL=//')
    echo "Loaded BACKEND_NGROK_URL: $BACKEND_NGROK_URL"
else
    echo "Error: .env file not found. Exiting."
    exit 1
fi

# Initial delay to allow server and ngrok to fully start up after setup
INITIAL_DELAY=20  # Increased delay to give ngrok more time
echo "Daemon starting with an initial delay of $INITIAL_DELAY seconds to allow server startup..."
sleep $INITIAL_DELAY

# Function to check if the server is reachable
check_server() {
    echo "Checking server status for URL: $BACKEND_NGROK_URL"
    
    # Capture the full response from curl
    response=$(curl -s --head --request GET "$BACKEND_NGROK_URL")
    
    # Print the full response to help with debugging
    echo "Full response from curl:"
    echo "$response"
    
    # Check for the 200 status in the response
    if echo "$response" | grep "HTTP/2 200" > /dev/null; then
        echo "Server check: $BACKEND_NGROK_URL is up."
        return 0 # Server is up
    else
        echo "Server check: $BACKEND_NGROK_URL is down."
        return 1 # Server is down
    fi
}

# Function to send email notification with the new URL using msmtp
send_email() {
    local new_url=$1
    echo "Preparing to send email notification with new URL: $new_url"
    local from_email=$(grep '^from' "$MSMTP_CONFIG" | awk '{print $2}')
    
    if [[ -z "$from_email" ]]; then
        echo "Error: Could not determine sender email from msmtp config."
        return 1
    fi

    echo -e "Subject: Server Restarted with New Ngrok URL\n\nYour server has restarted. The new ngrok URL is:\n$new_url" | msmtp --debug -a gmail "$from_email"
    
    if [[ $? -eq 0 ]]; then
        echo "Email notification sent successfully to $from_email"
    else
        echo "Failed to send email notification."
    fi
}

# Main loop to monitor the server continuously
while true; do
    echo "Starting server health check..."
    if check_server; then
        echo "Server $BACKEND_NGROK_URL is up."
    else
        echo "Server $BACKEND_NGROK_URL is down. Initiating restart..."
        
        # Run the restart script and capture output
        if bash "$RESTART_SCRIPT"; then
            echo "Restart script executed successfully."
        else
            echo "Error: Restart script failed to execute."
            continue
        fi
        
        # Reload the BACKEND_NGROK_URL from the updated .env file
        if [[ -f "$ENV_FILE" ]]; then
            BACKEND_NGROK_URL=$(grep '^BACKEND_NGROK_URL=' "$ENV_FILE" | sed 's/^BACKEND_NGROK_URL=//')
            echo "Reloaded BACKEND_NGROK_URL from .env: $BACKEND_NGROK_URL"
        else
            echo "Error: .env file not found after restart. Exiting loop."
            exit 1
        fi
        
        # Send email notification with the new ngrok URL
        send_email "$BACKEND_NGROK_URL"
        
        # Wait for a longer delay after restart to ensure full stabilization
        echo "Waiting 30 seconds for server to stabilize before next check..."
        sleep 30
    fi
    # Wait 60 seconds before checking again
    echo "Waiting 60 seconds before the next health check..."
    sleep 60
done