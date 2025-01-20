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

# Function to install Node.js 16 using NVM if the version is below 16
install_node16_if_necessary() {
    if command_exists node; then
        NODE_VERSION=$(node -v | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")
        NODE_MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d. -f1)
        if (( NODE_MAJOR_VERSION >= 16 )); then
            echo "Node.js version $NODE_VERSION is already installed and meets the version requirement."
            return
        fi
    fi

    echo "Node.js version 16+ is required. Installing NVM and Node.js 16..."

    # Ensure the .nvm directory exists
    if [[ ! -d "$HOME/.nvm" ]]; then
        mkdir -p "$HOME/.nvm"
    fi

    # Install NVM if it’s not already installed
    if ! command_exists nvm; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

        # Load NVM into the current shell session
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        # Add NVM to bash profile for future sessions
        if ! grep -q 'export NVM_DIR="$HOME/.nvm"' ~/.bashrc; then
            echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
            echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
        fi

        # Reload NVM for the current session
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # Check if NVM was successfully installed before proceeding
    if command_exists nvm; then
        # Use NVM to install and set Node.js 16 as the default
        nvm install 16
        nvm use 16
        nvm alias default 16
    else
        echo "Error: NVM installation failed. Please check for errors and try again."
        exit 1
    fi
}

# Install Node.js 16 if necessary
install_node16_if_necessary
echo "Node.js 16 setup complete."

# Function to configure swap if needed
configure_swap() {
    echo "Configuring swap memory..."
    sudo sed -i 's/^CONF_SWAPSIZE=.*$/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
    sudo systemctl restart dphys-swapfile
}

# Function to install build tools
install_build_tools() {
    echo "Installing build-essential for compiling native dependencies..."
    sudo apt update
    sudo apt install -y build-essential
}

echo "Applying additional system configurations for sqlite3 installation..."
configure_swap
install_build_tools
echo "Configuration complete, installing sqlite3..."
npm install sqlite3 --build-from-source
echo "sqlite3 installed successfully."

# Function to terminate background processes if they are running
terminate_processes() {
    pkill -f cloudflared
    pkill -f "node.*server\.js" 2>/dev/null
    pkill -f "daemon.sh" 2>/dev/null
}

# Trap function to handle early exit
trap 'echo "Script ended unexpectedly. Terminating all background processes."; terminate_processes' EXIT

terminate_processes


# Step 0: Check if mailutils is installed and install if necessary
echo "Checking for mailutils dependency..."

if ! command_exists mail; then
    echo "Installing mailutils..."
    if [[ "$OS" == "linux" || "$OS" == "raspbian" ]]; then
        sudo apt update
        sudo apt install -y mailutils
    elif [[ "$OS" == "macos" ]]; then
        if ! command_exists brew; then
            echo "Homebrew not found. Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install mailutils
    elif [[ "$OS" == "windows" ]]; then
        echo "mailutils is not natively supported on Windows. Please install an alternative mail utility if needed."
    fi
else
    echo "mailutils is already installed."
fi


# Step 1.5: Install required npm packages
echo "Checking for required npm packages..."

# List of specific packages needed
REQUIRED_NPM_PACKAGES=("bcryptjs" "cors" "dotenv" "express" "jsonwebtoken" "prompt-sync" "express-rate-limit"
    "serve-favicon" "cloudflared")

# Install any missing packages
for PACKAGE in "${REQUIRED_NPM_PACKAGES[@]}"; do
    if ! npm list "$PACKAGE" &>/dev/null; then
        echo "Installing $PACKAGE..."
        npm install "$PACKAGE"
    else
        echo "$PACKAGE is already installed."
    fi
done

echo "All required npm packages are installed."



# Step 2: Check for existing database
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
    echo "No database detected, creation of a new users.db necessary..."
fi


# Step 4: Configure environment variables
echo "Configuring environment variables..."

# Generate secure keys if necessary
JWT_SECRET=$(openssl rand -base64 32)
if [[ -f ".env" && "$new_db" == false ]]; then
    # Load the existing CRYPTO_SECRET_KEY if using existing database
    # Check if .env file exists and retrieve CRYPTO_SECRET_KEY if available
    if [[ -f ".env" && "$new_db" == false ]]; then
        CRYPTO_SECRET_KEY=$(grep '^CRYPTO_SECRET_KEY=' .env | sed 's/^CRYPTO_SECRET_KEY=//')
    fi
    echo "CRYPTO_SECRET_KEY=$CRYPTO_SECRET_KEY'"
else
    # Generate a new CRYPTO_SECRET_KEY if creating a new database or .env doesn't exist
    CRYPTO_SECRET_KEY=$(openssl rand -base64 32)
    echo "New cryptographic key generated for jwt secret"
fi
PORT=3000

# Write all to .env
cat > .env <<EOL
JWT_SECRET=${JWT_SECRET}
CRYPTO_SECRET_KEY=${CRYPTO_SECRET_KEY}
PORT=${PORT}
EOL



# Step 4.5: Prompt for and save email address


# Define the msmtp configuration file path
MSMTP_CONFIG="$HOME/.msmtprc"

# Install msmtp if not already installed
install_msmtp() {
    if command -v msmtp &>/dev/null; then
        echo "msmtp is already installed."
    else
        echo "Installing msmtp..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS installation
            brew install msmtp
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Raspbian OS installation
            sudo apt update && sudo apt install -y msmtp
        elif [[ "$OSTYPE" == "linux" ]]; then
            echo "Attempting installation in WSL"
            sudo apt update && sudo apt install -y msmtp
        else
            echo "Unsupported operating system. Please install msmtp manually."
            exit 1
        fi
    fi
}

configure_msmtp() {
    if [[ -f "$MSMTP_CONFIG" ]]; then
        echo "An msmtp configuration already exists."
        read -p "Do you want to keep the saved Gmail credentials? (y/n): " keep_credentials
        if [[ "$keep_credentials" == "y" ]]; then
            echo "Using existing configuration."
            return
        fi
    fi

    echo "Please go to https://myaccount.google.com/apppasswords and generate an app password for msmtp. Enter 'msmtp' as the app and use the generated password below."

    # Prompt for the Gmail address and validate format
    while true; do
        read -p "Enter your Gmail address (must end with @gmail.com): " USER_EMAIL
        if [[ "$USER_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@gmail\.com$ ]]; then
            break
        else
            echo "Invalid email format. Please enter a Gmail address."
        fi
    done

    # Prompt for Gmail password twice to confirm
    while true; do
        read -sp "Enter your Gmail password: " USER_PASSWORD
        echo
        read -sp "Confirm your Gmail password: " USER_PASSWORD_CONFIRM
        echo
        if [[ "$USER_PASSWORD" == "$USER_PASSWORD_CONFIRM" ]]; then
            break
        else
            echo "Passwords do not match. Please try again."
        fi
    done

    # Create or update the msmtp configuration file
    echo "Creating msmtp configuration..."
    cat <<EOF >"$MSMTP_CONFIG"
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/cert.pem
logfile        ~/.msmtp.log

account gmail
host smtp.gmail.com
port 587
from $USER_EMAIL
user $USER_EMAIL
password $USER_PASSWORD

account default : gmail
EOF

    # Secure the msmtp configuration file
    chmod 600 "$MSMTP_CONFIG"
    echo "msmtp configuration saved and secured."
}


# Run the installation and configuration functions
install_msmtp
configure_msmtp

echo "msmpt setup complete."




# Step 5: Initialize SQLite Database and Create Tables
if [[ "$new_db" == true ]]; then
    echo "Initializing SQLite database and creating tables..."
    node -e "
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./users.db');

    db.serialize(() => {
      db.run('DROP TABLE IF EXISTS users');
      db.run(\`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT,
          roles TEXT DEFAULT 'user'
        )
      \`);

      db.run('DROP TABLE IF EXISTS passwords');
      db.run(\`
        CREATE TABLE IF NOT EXISTS passwords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          service_name TEXT NOT NULL,
          username TEXT NOT NULL,
          encrypted_password TEXT NOT NULL,
          visibility TEXT CHECK (visibility IN ('private', 'family')) NOT NULL DEFAULT 'private',
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      \`);

      console.log('Database initialized and tables created.');
      db.close();
    });
    "
fi

# Step 8: Prompt for Admin Account Setup if no admin exists or new db created
echo "Setting up the admin account..."
if [[ "$new_db" == true ]]; then
    prompt_for_admin=true
else
    admin_exists=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM users WHERE roles = 'admin';")
    if [[ "$admin_exists" -eq 0 ]]; then
        prompt_for_admin=true
    else
        prompt_for_admin=false
    fi
fi

if [[ "$prompt_for_admin" == true ]]; then
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
else
    echo "Admin account already exists. Skipping admin setup. If you would like to reset the admin, please choose to overwrite the database."
fi






# Install Cloudflare Tunnel if necessary
install_cloudflared() {
    if command_exists cloudflared; then
        echo "Cloudflare Tunnel (cloudflared) is already installed."
        return
    fi
    echo "Installing Cloudflare Tunnel..."
    OS=$(uname | tr '[:upper:]' '[:lower:]')
    if grep -q "Raspbian" /etc/os-release; then
        OS="raspbian"
    fi

    if [[ "$OS" == "linux" || "$OS" == "raspbian" ]]; then
        sudo apt update
        sudo apt install -y curl
        curl -fsSL https://developers.cloudflare.com/cloudflare-one/static/cloudflared/install.sh | sudo bash
    elif [[ "$OS" == "darwin" ]]; then
        if ! command_exists brew; then
            echo "Homebrew not found. Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install cloudflared
    elif [[ "$OS" == "windows" ]]; then
        if ! command_exists choco; then
            echo "Chocolatey not found. Please install it manually from https://chocolatey.org/"
            exit 1
        fi
        choco install cloudflared -y
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










# Step 9: Start the Node.js server and monitor for crashes
echo "Starting the Node.js server..."
node server.js & SERVER_PID=$!

# Ensure any previous instance of daemon.sh is terminated
if pgrep -f daemon.sh > /dev/null; then
    pkill -f daemon.sh
    echo "Terminated existing instance of daemon.sh."
fi

# Start a new instance of daemon.sh in the background
nohup bash daemon.sh &> daemon.log &
echo "Started new instance of daemon.sh for server monitoring."


# Disable the trap just before the script finishes successfully
trap - EXIT
echo "Setup complete! Your password manager is available at https://$DOMAIN"

# Notify the user on the console
echo "You will also receive an email with the link."

# Send email notification with the ngrok URL
EMAIL_SUBJECT="Your App Setup is Complete"
EMAIL_BODY="Hello,\n\nYour application setup is complete. You can access it at the following URL:\n\n$NGROK_URL\n\nThank you!"
EMAIL_RECIPIENT="$USER_EMAIL"

echo -e "Subject: $EMAIL_SUBJECT\n\n$EMAIL_BODY" | msmtp "$EMAIL_RECIPIENT"
