# Backend Deployment Guide - Ubuntu Server

Deploy only the backend Azure Functions on Ubuntu server (your_domain_for_backend).  
Frontend is already deployed on Azure Static Web Apps.

## Step 1: Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs npm

# Verify installation
node --version
npm --version
```

## Step 2: Setup SSH Key for GitHub

```bash
# Generate SSH key
ssh-keygen -t ed25519

# Display public key (add this to GitHub)
cat ~/.ssh/id_ed25519.pub

# Test GitHub connection
ssh -T git@github.com
```

## Step 3: Setup Project Directory

```bash
# set permissions for project directory
sudo chown ubuntu:ubuntu /srv
cd /srv

# Clone the repository with sudo then fix ownership
sudo git clone git@github.com:dealzforest/meetingcost.git meetingcost
cd meetingcost
```

## Step 4: Install Azure Functions Core Tools

```bash
# Install Microsoft package repository
wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update

# Install Azure Functions Core Tools
sudo apt-get install azure-functions-core-tools-4

# Verify installation
func --version
```

## Step 5: Setup Backend

```bash
# Navigate to backend directory
cd /srv/meetingcost/backend

# Install dependencies (if any)
npm install

# Test Azure Functions locally
func start --host 0.0.0.0 --port 7071
# Press Ctrl+C after testing

cd /srv/meetingcost/backend
npm install
npm run dev
```

## Step 6: Install and Configure PM2

```bash
# Install PM2 globally
sudo npm install -g pm2


# Start Azure Functions with PM2 manually
cd /srv/meetingcost/backend
pm2 start func --name "backend" -- start --host 0.0.0.0 --port 7071

# Start Teams app  with PM2 manually
cd /srv/meetingcost/frontend
pm2 start npm --name "frontend" -- run preview -- --host 0.0.0.0 --port 3000


# Check status
pm2 status

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it provides (usually: sudo env PATH=... pm2 startup ubuntu -u ubuntu --hp /home/ubuntu)
```

## Step 7: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Edit nginx configuration
sudo nano /etc/nginx/sites-available/backend

# Add this configuration:
```
server {
    server_name <your_domain_for_backend>;

    location /api {
        proxy_pass http://localhost:7071;
    }
}
```bash
sudo nano /etc/nginx/sites-your_domain_for_frontend/frontend
```
server {
    server_name <your_domain_for_backend>;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain_for_backend
sudo certbot --nginx -d your_domain_for_frontend

```

## Step 8: Verify Backend

```bash
# Check PM2 services
pm2 status

# Check Nginx
sudo systemctl status nginx

# Test API endpoints
curl http://your_domain_for_backend/api/meeting/123
```

## Backend API Endpoints

- **Get Meeting Data**: `http://your_domain_for_backend/api/meeting`
- **Join Meeting**: `http://your_domain_for_backend/api/joinMeeting`
- **Update Rate**: `http://your_domain_for_backend/api/updateRate`

## Frontend Configuration

Update your Azure Static Web App frontend to use the new backend URL:

```javascript
// In your frontend code, change API base URL to:
const API_BASE_URL = 'http://your_domain_for_backend/api';
```

## Useful Commands

```bash
# PM2 commands
pm2 status
pm2 logs backend
pm2 restart backend

# Nginx commands
sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t

# Check logs
tail -f /srv/meetingcost/logs/azure-err.log
tail -f /var/log/nginx/error.log
```

## Troubleshooting

### If Azure Functions don't start:
```bash
cd /srv/meetingcost/backend
func start --host 0.0.0.0 --port 7071
```

### If CORS issues occur:
- Ensure the nginx CORS headers are properly configured
- Test direct access to `https://your_domain_for_backend/api/` first

### Check if services are running:
```bash
pm2 status
sudo netstat -tlnp | grep :7071
sudo netstat -tlnp | grep :80
```

## Success Criteria

✅ PM2 showing backend as running  
✅ API accessible at http://your_domain_for_backend/api/getMeetingData  
✅ CORS properly configured for frontend access  
✅ Services restart automatically after reboot