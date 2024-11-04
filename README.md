I’ll update the README.md to make sure code blocks are fully copy-pasteable.

D’Cipher - Secure Family Password Manager

D’Cipher is a highly secure, multi-user password manager designed for family-based access. It allows users to store passwords privately or share them with specific family members securely, using AES encryption, user authentication, and role-based access control.

This project is optimized for deployment on a Raspberry Pi but is compatible with other operating systems, including macOS and Linux.

Features

	•	Role-Based Access Control: Family members have user and admin roles, with admins able to manage family-wide settings.
	•	AES-256-GCM Encryption: All passwords are stored encrypted using robust encryption.
	•	Password Strength Evaluation: The app evaluates and displays the estimated security level of new passwords.
	•	SQLite Database: User and password data are stored in an SQLite database for persistence.
	•	Multi-OS Compatibility: Works on Raspberry Pi OS, macOS, and other Linux distributions.
	•	Remote Access via ngrok: Access your password manager securely from outside your network.
	•	Email Notifications: Sends setup completion notifications via email (Linux/macOS only).
	•	Environment Configuration: Automatically configures JWT and encryption keys, with manual options available.

Table of Contents

	1.	Setup
	2.	Project Structure
	3.	Routes and Endpoints
	4.	Security Considerations
	5.	Usage
	6.	Troubleshooting

Setup

1. System Requirements

	•	Node.js and npm
	•	SQLite
	•	ngrok for remote access
	•	msmtp for email notifications (optional, only for non-Windows systems)

2. Installation and Configuration

Clone the repository:
git clone https://github.com/your-repo/dcipher.git
cd dcipher

Run the setup script:

chmod +x setup.sh
./setup.sh

3. Environment Variables

A .env file is generated with the following variables:

	•	JWT_SECRET: Secret for JWT token generation
	•	CRYPTO_SECRET_KEY: Secret key for AES encryption
	•	PORT: Port the server will run on (default is 3000)
	•	BACKEND_NGROK_URL: Public URL for external access via ngrok

Project Structure

	•	controllers/: Contains controller functions for user and password management.
	•	middleware/: Middleware for token verification and role authorization.
	•	models/: Database interactions for User and Password tables.
	•	views/: HTML views for the frontend (e.g., login and home pages).
	•	config/: Configuration for the database and other services.
	•	utils/: Utility functions for cryptography and data processing.

Routes and Endpoints

Authentication

	•	POST /login: User login; rate-limited to prevent brute-force attacks.
	•	POST /create: Admin-only route to create new family accounts.

Password Management

	•	POST /create: Create a new password entry.
	•	GET /visible: Retrieve all visible passwords for the logged-in user.
	•	PUT /update/:id: Update password entry.
	•	DELETE /delete/:id: Delete a password entry.

User Management

	•	GET /user/:id: Retrieve user details.
	•	PUT /user/:id: Update user details.
	•	DELETE /delete-user/:id: Delete a user.

Security Considerations

1. AES Encryption for Passwords

	•	AES-256-GCM is used for password encryption, ensuring data confidentiality and integrity.
	•	The CRYPTO_SECRET_KEY environment variable should be kept secure.

2. JWT Authentication

	•	JWT tokens authenticate users and store session information, expiring after 1 hour by default.

3. Role-Based Access Control

	•	Roles are defined as user or admin, with admin users having additional privileges.
	•	Family-wide passwords can only be managed by admins for better security.

4. Rate Limiting for Login Attempts

	•	The login route is rate-limited to prevent brute-force attacks (5 attempts per minute per IP).

5. Environment Variables

	•	Sensitive keys and URLs are stored in .env. It’s crucial to restrict access to this file.

Usage

Starting the Application
    always use the ./setup.sh script as the point of entry, it cleans up
    previous processes, remembers configuration, starts the server, and emails/outputs your frotend link


	2.	Access the Application:
	•	Visit http://localhost:3000/home for local access.
	•	Use the BACKEND_NGROK_URL provided in .env for remote access.

Admin Features

	•	The admin can add family members, delete users, and update password visibility settings.

Password Manager Usage

	1.	Add a Password: Enter service name, username, password, and visibility (private/family).
	2.	Search by Service Name: Use the search bar to find passwords by service name.
	3.	View Password Strength: Passwords are evaluated for strength upon entry.

Troubleshooting

	•	Missing Dependencies: Re-run npm install if packages are missing.
	•	ngrok Issues: Ensure ngrok is authenticated. Run ngrok authtoken <token> if needed.
	•	Database Initialization Issues: Check if users.db exists. Delete and re-run setup.sh if necessary.
	•	Email Notifications: If msmtp fails, verify your Gmail app password.

License

D’Cipher is licensed under the MIT License.