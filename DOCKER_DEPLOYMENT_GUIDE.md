# Docker Setup Guide for Local Development & Render Deployment

## 🖥️ **LOCAL DEVELOPMENT SETUP**

### Step 1: Install Docker Desktop
1. **Download Docker Desktop**: https://www.docker.com/products/docker-desktop
2. **Install and start Docker Desktop**
3. **Verify installation**:
   ```bash
   docker --version
   docker-compose --version
   ```

### Step 2: Build Base Container Image
```bash
# Build the base game container image
docker-compose build

# Create the Docker network
docker-compose up --no-start
```

### Step 3: Enable Docker Mode
```bash
# Windows PowerShell
$env:USE_DOCKER="true"
npm start

# Windows CMD
set USE_DOCKER=true
npm start

# Linux/Mac
export USE_DOCKER=true
npm start
```

### Step 4: Test Docker Mode
```bash
node test-docker-game.js
```

---

## ☁️ **RENDER DEPLOYMENT SETUP**

### Option 1: Render with Docker Support (Recommended)

#### 1.1 Update Render Service Configuration
In your Render dashboard:

1. **Service Type**: Change to "Docker" (if not already)
2. **Dockerfile Path**: `Dockerfile.game-base` (or create a main Dockerfile)
3. **Environment Variables**:
   ```
   USE_DOCKER=true
   NODE_ENV=production
   MONGODB_URI=your_mongodb_uri
   SESSION_SECRET=your_session_secret
   STRIPE_SECRET_KEY=your_stripe_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   ```

#### 1.2 Create Main Dockerfile for Render
Create `Dockerfile` in project root:
```dockerfile
FROM node:18-alpine

# Install dumb-init and Docker CLI
RUN apk add --no-cache dumb-init docker-cli

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 appuser && adduser -D -u 1001 -G appuser appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
```

#### 1.3 Update docker-compose.yml for Production
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - USE_DOCKER=true
      - NODE_ENV=production
    networks:
      - gamepad-internal
    depends_on:
      - game-base

  game-base:
    build:
      context: .
      dockerfile: Dockerfile.game-base
    image: gamepad-game-base
    networks:
      - gamepad-internal
    profiles:
      - build-only

networks:
  gamepad-internal:
    driver: bridge
    internal: false
```

### Option 2: Render with Docker-in-Docker (Alternative)

If Render doesn't support Docker-in-Docker, you can use a different approach:

#### 2.1 Use Docker-in-Docker Image
Update your main `Dockerfile`:
```dockerfile
FROM docker:20-dind

# Install Node.js
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 appuser && adduser -D -u 1001 -G appuser appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Start Docker daemon and application
CMD ["sh", "-c", "dockerd-entrypoint.sh & sleep 10 && node server.js"]
```

#### 2.2 Update GameContainerManager for Docker-in-Docker
Modify `utils/GameContainerManager.js` Docker connection:
```javascript
// Connect to Docker daemon
this.docker = new Docker({
  socketPath: '/var/run/docker.sock' // Docker-in-Docker socket
});
```

---

## 🔧 **ENVIRONMENT VARIABLES FOR RENDER**

Add these to your Render service environment variables:

```bash
# Docker Configuration
USE_DOCKER=true
DOCKER_HOST=unix:///var/run/docker.sock

# Resource Limits
GAME_CONTAINER_MEMORY=128
GAME_CONTAINER_CPU=0.5

# Application Configuration
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=your_mongodb_connection_string

# Session
SESSION_SECRET=your_session_secret

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

---

## 🚀 **DEPLOYMENT STEPS**

### For Render Deployment:

1. **Create main Dockerfile** (if using Option 1)
2. **Update docker-compose.yml** for production
3. **Set environment variables** in Render dashboard
4. **Deploy** - Render will build and run the Docker container
5. **Monitor logs** for container creation/cleanup

### For Local Development:

1. **Install Docker Desktop**
2. **Build base image**: `docker-compose build`
3. **Create network**: `docker-compose up --no-start`
4. **Set environment**: `$env:USE_DOCKER="true"`
5. **Start server**: `npm start`

---

## 🔍 **TROUBLESHOOTING**

### Common Issues:

1. **"Cannot connect to Docker daemon"**
   - Ensure Docker Desktop is running
   - Check Docker socket permissions

2. **"Base image not found"**
   - Run `docker-compose build` first
   - Check if `gamepad-game-base` image exists

3. **"Network not found"**
   - Run `docker-compose up --no-start`
   - Check if `gamepad-internal` network exists

4. **"Container creation failed"**
   - Check Docker daemon logs
   - Verify resource limits aren't too restrictive

### Debug Commands:

```bash
# Check Docker status
docker info

# List images
docker images

# List networks
docker network ls

# Check running containers
docker ps

# View container logs
docker logs <container_id>
```

---

## 📊 **MONITORING**

### Container Health Checks:
- Memory usage monitoring
- CPU usage monitoring
- Container uptime tracking
- Message count limits
- Automatic cleanup on exit

### Log Monitoring:
- Container creation/deletion logs
- WebSocket connection logs
- Game execution logs
- Error logs with stack traces

---

## 🎯 **NEXT STEPS**

1. **Install Docker Desktop** locally
2. **Test Docker mode** locally first
3. **Create main Dockerfile** for Render
4. **Update Render service** to use Docker
5. **Set environment variables** in Render
6. **Deploy and monitor** container creation

The Docker containerization provides **enterprise-grade security** with complete isolation, resource limits, and automatic cleanup! 🛡️
