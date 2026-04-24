# WBHelper Deployment Guide

Complete deployment instructions for the Marketplace Seller Optimizer on Ubuntu/Debian VDS.

## Prerequisites

- **Operating System**: Ubuntu 20.04+ or Debian 11+
- **VDS/Server**: Root or sudo access
- **SSH Access**: Valid credentials to connect remotely
- **Domain Name**: Optional, required only for Let's Encrypt SSL

---

## Section 1: System Setup

### 1.1 Update System Packages

Connect to your VDS via SSH, then update package lists and upgrade existing packages:

```bash
ssh root@your-vps-ip
```

```bash
# Update package lists
apt update

# Upgrade all packages to latest versions
apt upgrade -y

# Install basic utilities (if not already present)
apt install -y curl wget vim ca-certificates gnupg lsb-release
```

**Expected Output:**
```
Reading package lists... Done
Building dependency tree... Done
0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.
```

### 1.2 Install Docker

Install Docker using the official convenience script:

```bash
# Download and run the official Docker installation script
curl -fsSL https://get.docker.com | sh

# Verify Docker installation
docker --version
```

**Expected Output:**
```
Docker version 24.0.7, build a424133
```

### 1.3 Install Docker Compose (v2+)

Docker Compose v2 is included with Docker Engine 24.0+ as a plugin. Verify it's available:

```bash
# Check Docker Compose version (plugin)
docker compose version

# If not available as plugin, install separately
apt install -y docker-compose-v2
```

**Expected Output:**
```
Docker Compose version v2.21.0
```

### 1.4 Configure Firewall (UFW)

Set up uncomplicated firewall to allow SSH, HTTP, and HTTPS:

```bash
# Check if UFW is installed
which ufw || apt install -y ufw

# Allow SSH connections (prevent lockout)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
ufw --force enable

# Check firewall status
ufw status verbose
```

**Expected Output:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

### 1.5 Create Deployment User (Security Best Practice)

Create a dedicated user for running containers (non-root):

```bash
# Create deployment user
adduser deployer

# Add user to docker group
usermod -aG docker deployer

# Switch to deployment user
su - deployer
```

---

## Section 2: Application Deployment

### 2.1 Clone Repository

Log in as the deployment user and clone the repository:

```bash
# As deployment user
cd ~

# Clone the repository
git clone https://github.com/your-org/wbhelper.git

# Navigate to project directory
cd wbhelper
```

### 2.2 Create Environment Configuration

Copy the example environment file and configure your production values:

```bash
# Copy example environment file
cp .env.example .env

# Edit with your production values
nano .env
```

**Required .env values:**

```env
# JWT Secret - MUST be changed in production
# Generate with: openssl rand -base64 48
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# Database path (default is fine for single-server deployment)
DATABASE_PATH=/data/wbhelper.db

# Logging level
LOG_LEVEL=info
```

### 2.3 Generate SSL Certificates

Generate a self-signed SSL certificate for local/HTTP testing, or use Let's Encrypt for production (see Section 4).

**Self-signed certificate generation:**

```bash
# Run the SSL generation script
./scripts/generate-ssl.sh

# Verify certificates were created
ls -la /etc/nginx/ssl/
```

**Expected Output:**
```
total 4
-rw-r--r-- 1 root root 1245 Jan 15 10:30 fullchain.pem
-rw------- 1 root root 1704 Jan 15 10:30 privkey.pem
```

> **Security Note**: Self-signed certificates are for development/testing only. Production deployments should use Let's Encrypt or a commercial CA.

### 2.4 Build Docker Images

Build the application container:

```bash
# Build the Docker image
docker compose build
```

**Expected Output:**
```
[+] Building 120.0s (15/15) FINISHED
...
```

### 2.5 Start Services

Start all services with Docker Compose:

```bash
# Start services in detached mode
docker compose up -d

# Verify services are running
docker compose ps
```

**Expected Output:**
```
NAME            IMAGE          STATUS          PORTS
wbhelper-db     alpine:3.19    Up              -
wbhelper-api    wbhelper       Up              127.0.0.1:8080->8080/tcp
wbhelper-nginx  nginx:alpine   Up              0.0.0.0:80->80/tcp
```

---

## Section 3: Nginx Configuration

### 3.1 Copy Nginx Configuration

Copy the nginx.conf to the system configuration directory:

```bash
# Copy configuration file
sudo cp /home/deployer/wbhelper/nginx.conf /etc/nginx/nginx.conf

# Create SSL directory if using self-signed certs
sudo mkdir -p /etc/nginx/ssl

# Copy SSL certificates
sudo cp /home/deployer/wbhelper/ssl/fullchain.pem /etc/nginx/ssl/
sudo cp /home/deployer/wbhelper/ssl/privkey.pem /etc/nginx/ssl/
```

### 3.2 Update Nginx Configuration for Your Domain

If you have a domain name, update the nginx.conf:

```bash
# Edit nginx configuration
sudo nano /etc/nginx/nginx.conf
```

Replace `_` in `server_name _;` with your domain:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # ... rest of config
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    # ... rest of config
}
```

### 3.3 Test Nginx Configuration

Test that the configuration syntax is valid:

```bash
# Test configuration syntax
sudo nginx -t
```

**Expected Output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 3.4 Enable Site and Reload

If using additional site configuration (not overriding default):

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/wbhelper /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t && sudo nginx -s reload
```

---

## Section 4: SSL Configuration (Let's Encrypt - Optional)

For production HTTPS, use Let's Encrypt to obtain free trusted certificates.

### 4.1 Install Certbot

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

**Expected Output:**
```
certbot 2.1.0
```

### 4.2 Obtain Certificate

Stop nginx briefly to allow certbot to verify domain ownership:

```bash
# Stop nginx
sudo systemctl stop nginx

# Obtain certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Restart nginx
sudo systemctl start nginx
```

**Expected Output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/your-domain.com/fullchain.pem
Key is saved at: /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 4.3 Update Nginx SSL Paths

Update nginx.conf with Let's Encrypt certificate paths:

```bash
sudo nano /etc/nginx/nginx.conf
```

Update these lines:

```nginx
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

### 4.4 Enable Auto-Renewal

Let's Encrypt certificates expire after 90 days. Set up automatic renewal:

```bash
# Test automatic renewal
sudo certbot renew --dry-run

# If successful, set up cron job
sudo crontab -e
```

Add the following line:

```
0 0 * * * certbot renew --quiet --deploy-hook "nginx -s reload"
```

---

## Section 5: Health Check Verification

After deployment, verify all services are functioning correctly.

### 5.1 Verify Backend Health

Check the backend API health endpoint:

```bash
curl -f http://localhost:8080/health
```

**Expected Output:**
```json
{"status":"healthy","timestamp":"2026-01-15T10:30:00Z"}
```

### 5.2 Verify Nginx Health

Check the nginx health endpoint:

```bash
curl -f http://localhost/health
```

**Expected Output:**
```json
{"status":"healthy","timestamp":"2026-01-15T10:30:00Z"}
```

### 5.3 Check Docker Compose Logs

Review logs for any errors:

```bash
# View all service logs
docker compose logs

# View specific service logs
docker compose logs wbhelper
docker compose logs nginx
docker compose logs db

# Follow logs in real-time
docker compose logs -f
```

### 5.4 Verify Container Status

Check all containers are healthy:

```bash
# List all containers
docker compose ps -a

# Inspect specific container health
docker inspect wbhelper-api --format='{{.State.Health.Status}}'
```

**Expected Output:**
```
healthy
```

---

## Section 6: Troubleshooting

### Common Issues and Solutions

#### Issue: Backend container won't start

**Symptoms:** `docker compose logs wbhelper` shows connection errors

**Solutions:**
```bash
# Check if database is healthy
docker compose ps db

# Verify database health check
docker inspect wbhelper-db --format='{{.State.Health.Status}}'

# Restart services in order
docker compose restart db
sleep 5
docker compose restart wbhelper
```

#### Issue: Nginx returns 502 Bad Gateway

**Symptoms:** Browser shows 502 error when accessing application

**Solutions:**
```bash
# Verify backend is responding
curl -v http://localhost:8080/health

# Check nginx logs
docker compose logs nginx

# Restart nginx
docker compose restart nginx

# Verify backend container is healthy
docker inspect wbhelper-api --format='{{.State.Health.Status}}'
```

#### Issue: SSL certificate warnings in browser

**Symptoms:** Browser shows "Your connection is not private" warning

**Solutions:**
- For development: Accept the self-signed certificate warning
- For production: Install Let's Encrypt certificate (see Section 4)
- Verify certificate paths in nginx.conf are correct

#### Issue: `docker compose up` fails with permission error

**Symptoms:** Error: " permission denied" when creating files

**Solutions:**
```bash
# Fix ownership of project directory
sudo chown -R deployer:deployer /home/deployer/wbhelper

# Ensure docker socket permissions
ls -la /var/run/docker.sock
```

#### Issue: Port 80/443 already in use

**Symptoms:** Error: "Port is already allocated"

**Solutions:**
```bash
# Check what is using the port
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service
sudo systemctl stop apache2  # or nginx
sudo systemctl disable apache2
```

### Log Locations

| Service | Log Command | Log File |
|---------|-------------|----------|
| Backend | `docker compose logs wbhelper` | Container stdout |
| Nginx | `docker compose logs nginx` | Container stdout |
| Database | `docker compose logs db` | Container stdout |
| Nginx (system) | `sudo tail -f /var/log/nginx/error.log` | /var/log/nginx/error.log |
| Nginx (system) | `sudo tail -f /var/log/nginx/access.log` | /var/log/nginx/access.log |
| Docker | `sudo journalctl -u docker` | System journal |

### Restart Procedures

**Restart all services:**
```bash
docker compose restart
```

**Restart specific service:**
```bash
docker compose restart wbhelper
docker compose restart nginx
docker compose restart db
```

**Full redeployment:**
```bash
# Stop all services
docker compose down

# Pull latest changes (if applicable)
git pull

# Rebuild and start
docker compose build
docker compose up -d

# Verify health
curl -f http://localhost:8080/health
```

**System reboot recovery:**
```bash
# Services are configured with 'restart: unless-stopped'
# They will automatically start after system reboot

# Verify auto-start
docker compose ps
```

---

## Security Considerations

### 1. Non-Root User
Always run containers as a non-root user. The deployment user (`deployer`) is in the `docker` group, allowing container management without root.

### 2. Firewall Configuration
UFW is configured to allow only necessary ports:
- 22/tcp (SSH)
- 80/tcp (HTTP)
- 443/tcp (HTTPS)

### 3. SSL/TLS
- Self-signed certificates for development only
- Use Let's Encrypt or commercial CA for production
- TLS 1.2 and 1.3 only (deprecated TLS 1.0/1.1 disabled)

### 4. Environment Variables
- Never commit `.env` to version control
- Use strong random values for `JWT_SECRET`
- Rotate secrets periodically in production

### 5. Container Resources
Docker Compose limits resource usage:
- Backend: max 1 CPU, 512MB RAM
- Prevents container from consuming all server resources

### 6. Database
- SQLite data stored in Docker volume
- Volume: `wbhelper-data`

---

## Quick Reference

```bash
# Full deployment
ssh deployer@vps-ip
cd wbhelper
cp .env.example .env
nano .env  # Edit production values
./scripts/generate-ssl.sh
docker compose up -d

# Health checks
curl http://localhost:8080/health
curl http://localhost/health

# View logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down
```