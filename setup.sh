#!/bin/bash

# Detect the Operating System
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if uname -m | grep -q "arm"; then
        OS="raspbian"
    else
        OS="linux"
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "cygwin" || "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    OS="windows"
fi

echo "Detected OS: $OS"

# Function to check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Install Node.js 16 if necessary
install_node16_if_necessary() {
    if command_exists node; then
        NODE_VERSION=$(node -v | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")
        NODE_MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d. -f1)
        if (( NODE_MAJOR_VERSION >= 16 )); then
            echo "Node.js version $NODE_VERSION is already installed and meets the version requirement."
            return
        fi
    fi

    echo "Installing Node.js 16 using NVM..."
    if [[ ! -d "$HOME/.nvm" ]]; then
        mkdir -p "$HOME/.nvm"
    fi

    if ! command_exists nvm; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    nvm install 16
    nvm use 16
    nvm alias default 16
}

install_node16_if_necessary

# Ensure required npm dependencies are installed
install_npm_dependencies() {
    echo "Checking for required npm dependencies..."
    if ! npm list sqlite3 &>/dev/null || ! npm list dotenv &>/dev/null || ! npm list bcryptjs &>/dev/null || ! npm list prompt-sync &>/dev/null; then
        echo "Installing missing npm dependencies..."
        npm install sqlite3 dotenv bcryptjs prompt-sync
    else
        echo "All required npm dependencies are already installed."
    fi
}

install_npm_dependencies

# Install Cloudflare Tunnel if necessary
install_cloudflared() {
    if command_exists cloudflared; then
        echo "Cloudflare Tunnel (cloudflared) is already installed."
        return
    fi
    echo "Installing Cloudflare Tunnel..."
    if [[ "$OS" == "linux" || "$OS" == "raspbian" ]]; then
        sudo apt update && sudo apt install -y cloudflared
    elif [[ "$OS" == "macos" ]]; then
        brew install cloudflared
    elif [[ "$OS" == "windows" ]]; then
        choco install cloudflared
    else
        echo "Unsupported OS. Please install cloudflared manually."
        exit 1
    fi
}

install_cloudflared


while true; do
    read -p "Have you deleted the current DNS record for server.d-cipher.uk? Type 'Yes' to continue: " confirm
    if [[ "$confirm" == "Yes" || "$confirm" == "yes" ]]; then
        echo "Confirmed. Proceeding with setup..."
        break
    else
        echo "You must delete the DNS record before continuing."
    fi
done

# **Cloudflare Setup**
echo "Resetting Cloudflare Tunnel setup..."

# Kill any running cloudflared processes
pkill -f cloudflared 2>/dev/null

# Remove existing Cloudflare credentials and config
rm -rf ~/.cloudflared
mkdir -p ~/.cloudflared

# Authenticate Cloudflare Tunnel
echo "Authenticating Cloudflare Tunnel..."
cloudflared tunnel login

# Set tunnel details
TUNNEL_NAME="my-password-server"
DOMAIN="server.d-cipher.uk"

# Delete the old tunnel if it exists
if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo "Cloudflare Tunnel $TUNNEL_NAME already exists."
    echo "Attempting to delete the existing Cloudflare Tunnel..."

    # Try deleting the tunnel
    if ! cloudflared tunnel delete "$TUNNEL_NAME"; then
        echo "Failed to delete tunnel due to active connections. Running cleanup..."
        
        # Run cleanup and retry deletion
        cloudflared tunnel cleanup
        sleep 2  # Short delay to ensure cleanup finishes

        echo "Retrying tunnel deletion..."
        if ! cloudflared tunnel delete "$TUNNEL_NAME"; then
            echo "ERROR: Tunnel deletion failed again. Please manually verify connections."
            exit 1
        fi
    fi

    echo "Creating a new Cloudflare Tunnel..."
    cloudflared tunnel create "$TUNNEL_NAME"
else
    echo "Creating a new Cloudflare Tunnel..."
    cloudflared tunnel create "$TUNNEL_NAME"
fi

# Retrieve the tunnel UUID
TUNNEL_UUID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

# Ensure the tunnel UUID is valid
if [[ -z "$TUNNEL_UUID" ]]; then
    echo "Error: Failed to create or retrieve Cloudflare tunnel."
    exit 1
fi

# **Force-create the DNS Record**
echo "Forcing DNS record creation for $DOMAIN..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN"

# Create the Cloudflare configuration file
echo "Writing Cloudflare config file..."
cat <<EOF > ~/.cloudflared/config.yml
tunnel: $TUNNEL_UUID
credentials-file: /Users/$USER/.cloudflared/$TUNNEL_UUID.json

ingress:
  - hostname: $DOMAIN
    service: http://localhost:3000
  - service: http_status:404
EOF

# Start the Cloudflare Tunnel
echo "Starting Cloudflare Tunnel..."
nohup cloudflared tunnel --config ~/.cloudflared/config.yml run "$TUNNEL_NAME" &>/dev/null &
# **Database Setup**
DB_FILE="./users.db"
new_db=false
if [[ -f "$DB_FILE" ]]; then
    read -p "A database file already exists. Do you want to use the existing database (y) or overwrite it (n)? " use_existing_db
    if [[ "$use_existing_db" != "y" ]]; then
        rm -f "$DB_FILE"
        echo "Existing database removed. A new database will be created."
        new_db=true
    else
        echo "Using existing database."
    fi
else
    new_db=true
fi

if [[ "$new_db" == true ]]; then
    echo "Initializing SQLite database and creating tables..."
    node -e "
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./users.db');

    db.serialize(() => {
      db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, roles TEXT DEFAULT \"user\")');
      db.run('CREATE TABLE IF NOT EXISTS passwords (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, service_name TEXT NOT NULL, username TEXT NOT NULL, encrypted_password TEXT NOT NULL, visibility TEXT CHECK (visibility IN (\"private\", \"family\")) NOT NULL DEFAULT \"private\", FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)');
      console.log('Database initialized and tables created.');
      db.close();
    });
    "
fi

# **Prompt for Admin Account Setup**
echo "Setting up the admin account..."
admin_exists=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM users WHERE roles = 'admin';")

if [[ "$new_db" == true || "$admin_exists" -eq 0 ]]; then
  node -e "
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('./users.db');
  const bcrypt = require('bcryptjs');
  const prompt = require('prompt-sync')({sigint: true});

  const username = prompt('Enter a username for the admin: ');
  
  let password, confirmPassword;
  do {
    password = prompt.hide('Enter a password for the admin: ');
    confirmPassword = prompt.hide('Confirm password: ');

    if (password !== confirmPassword) {
      console.log('Passwords do not match. Please try again.');
    }
  } while (password !== confirmPassword);

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run('INSERT INTO users (username, password, roles) VALUES (?, ?, ?)', [username, hashedPassword, 'admin'], function (err) {
    if (err) {
      console.error('Error creating admin user:', err.message);
    } else {
      console.log('Admin user created with username:', username);
    }
    db.close();
  });
  "
fi


# Start the Node.js server
echo "Starting Node.js server..."
nohup node server.js &>/dev/null &

echo "Setup complete! Your password manager is available at https://$DOMAIN"