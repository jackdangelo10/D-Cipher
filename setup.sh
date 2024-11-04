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

# Function to terminate background processes if they are running
terminate_processes() {
    pkill -f "ngrok http" 2>/dev/null
    pkill -f "node.*server\.js" 2>/dev/null
    pkill -f "daemon.sh" 2>/dev/null
}

# Trap function to handle early exit
trap 'echo "Script ended unexpectedly. Terminating all background processes."; terminate_processes' EXIT

terminate_processes


echo "Detected OS: $OS"


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


# Step 1: Install Node.js, npm, and SQLite based on OS if they are not installed
echo "Checking for Node.js, npm, and SQLite..."

if ! command_exists node || ! command_exists npm; then
    echo "Installing Node.js and npm..."
    if [[ "$OS" == "linux" || "$OS" == "raspbian" ]]; then
        sudo apt update
        sudo apt install -y nodejs npm
    elif [[ "$OS" == "macos" ]]; then
        if ! command_exists brew; then
            echo "Homebrew not found. Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install node
    elif [[ "$OS" == "windows" ]]; then
        echo "Please install Node.js manually: https://nodejs.org/"
        read -p "Press Enter to continue after installing Node.js and npm."
    fi
else
    echo "Node.js and npm are already installed."
fi

# Step 1.5: Check if sqlite3 is already installed
if npm list sqlite3 &>/dev/null; then
    echo "sqlite3 is already installed. Skipping sqlite3 installation."
else
    echo "sqlite3 is not installed. Proceeding with temporary exclusion and installation..."

    # Temporarily remove sqlite3 from package.json and install other packages
    echo "Temporarily excluding sqlite3 from package.json dependencies..."

    # Backup package.json
    cp package.json package.json.bak

    # Remove sqlite3 from package.json dependencies
    jq 'del(.dependencies.sqlite3)' package.json > temp.json && mv temp.json package.json

    # Install remaining packages from package.json, excluding sqlite3
    echo "Installing all dependencies except sqlite3..."
    npm install --no-save

    # Restore original package.json
    mv package.json.bak package.json
    echo "Restored package.json with sqlite3 included."

    # Configure swap and install sqlite3 with concurrency limited to 1
    install_sqlite3_with_swap() {
        echo "Configuring additional swap memory for sqlite3 installation..."
        sudo sed -i 's/^CONF_SWAPSIZE=.*$/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
        sudo systemctl restart dphys-swapfile

        echo "Installing sqlite3 with limited concurrency. This may take some time (5-20 min for 1GB RAM)..."
        npm install sqlite3 --build-from-source --concurrency=1

        # Restore default swap settings after sqlite3 installation
        sudo sed -i 's/^CONF_SWAPSIZE=.*$/CONF_SWAPSIZE=100/' /etc/dphys-swapfile
        sudo systemctl restart dphys-swapfile
        echo "Reverted swap configuration."
    }

    # Call the function to install sqlite3 with swap enabled
    install_sqlite3_with_swap
fi



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
fi

# Step 3: Install project dependencies
echo "Setting up project dependencies..."
npm install

# Install prompt-sync if not already installed
if ! npm list prompt-sync &>/dev/null; then
    echo "Installing prompt-sync for command-line prompts..."
    npm install prompt-sync
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
EMAIL_RECIPIENT=""  # Initialize EMAIL_RECIPIENT globally

# Function to detect and set the certificate path
configure_certificate_path() {
    if [[ -f "/etc/ssl/cert.pem" ]]; then
        echo "/etc/ssl/cert.pem"
    elif [[ -f "/etc/ssl/certs/ca-certificates.crt" ]]; then
        echo "/etc/ssl/certs/ca-certificates.crt"
    elif [[ -f "/etc/ssl/certs/ca-bundle.crt" ]]; then
        echo "/etc/ssl/certs/ca-bundle.crt"
    else
        echo "none"  # No valid cert file found
    fi
}

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
            EMAIL_RECIPIENT="$USER_EMAIL"
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
            EMAIL_RECIPIENT="$USER_EMAIL"  # Set EMAIL_RECIPIENT here
            break
        else
            echo "Passwords do not match. Please try again."
        fi
    done

    # Detect the correct certificate path
    CERT_PATH=$(configure_certificate_path)
    if [[ "$CERT_PATH" == "none" ]]; then
        echo "Warning: No valid certificate file found for msmtp. TLS may not work without it."
    fi

    # Create or update the msmtp configuration file
    echo "Creating msmtp configuration..."
    cat <<EOF >"$MSMTP_CONFIG"
defaults
auth           on
tls            on
tls_trust_file ${CERT_PATH}
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

echo "Setup complete."




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

# Step 6: Install ngrok based on OS if not installed
echo "Checking for ngrok..."

if ! command_exists ngrok; then
    echo "Installing ngrok..."
    if [[ "$OS" == "linux" || "$OS" == "raspbian" ]]; then
        curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /usr/share/keyrings/ngrok.asc >/dev/null
        echo "deb [signed-by=/usr/share/keyrings/ngrok.asc] https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list >/dev/null
        sudo apt update && sudo apt install ngrok
    elif [[ "$OS" == "macos" ]]; then
        brew install ngrok
    elif [[ "$OS" == "windows" ]]; then
        echo "Downloading and installing ngrok..."
        curl -o ngrok.zip https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip
        unzip ngrok.zip -d "$HOME" && rm ngrok.zip
        export PATH="$HOME:$PATH"
        echo 'export PATH="$HOME:$PATH"' >> ~/.bashrc
        source ~/.bashrc
    fi
else
    echo "ngrok is already installed."
fi

# Step 7: Start ngrok with saved auth token or prompt for one
NGROK_TOKEN_FILE="$HOME/.ngrok_token"

if [[ -f "$NGROK_TOKEN_FILE" ]]; then
    echo "A saved ngrok authentication token was found."
    read -p "Do you want to use the saved ngrok token? (y/n): " use_saved_token
    if [[ "$use_saved_token" == "y" ]]; then
        NGROK_TOKEN=$(cat "$NGROK_TOKEN_FILE")
    else
        read -p "Enter a new ngrok authentication token (from ngrok.com): " NGROK_TOKEN
        echo "$NGROK_TOKEN" > "$NGROK_TOKEN_FILE"
    fi
else
    read -p "Enter ngrok authentication token (from ngrok.com): " NGROK_TOKEN
    echo "$NGROK_TOKEN" > "$NGROK_TOKEN_FILE"
fi

ngrok authtoken "$NGROK_TOKEN"

if [[ $? -ne 0 ]]; then
    echo "ngrok authentication failed. Please check your token and try again."
    exit 1
fi

# Start ngrok HTTP tunnel on port 3000 in the background without attaching to terminal
nohup ngrok http 3000 &>/dev/null &
sleep 2 # Wait for ngrok to fully start

# Fetch and save ngrok URL to .env
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

if [[ -z "$NGROK_URL" ]]; then
    echo "Failed to retrieve ngrok URL. Exiting setup."
    exit 1
fi

echo "BACKEND_NGROK_URL=${NGROK_URL}" >> .env

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
echo "Setup complete! Your app is available at $NGROK_URL".

# Notify the user on the console
echo "You will also receive an email with the link."

# Send email notification with the ngrok URL
EMAIL_SUBJECT="Your App Setup is Complete"
EMAIL_BODY="Hello,\n\nYour application setup is complete. You can access it at the following URL:\n\n$NGROK_URL\n\nThank you!"

echo "EMAIL_RECIPIENT is set to: $EMAIL_RECIPIENT"
echo -e "Subject: $EMAIL_SUBJECT\n\n$EMAIL_BODY" | msmtp "$EMAIL_RECIPIENT"