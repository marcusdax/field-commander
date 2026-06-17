# Field Commander v4.0 - Deployment Guide

## Quick Start - Local Development

### Prerequisites
- Node.js v20+ and npm v10+
- Docker and Docker Compose
- PostgreSQL 16+ (or use Docker)
- Redis 7+ (or use Docker)

### Setup Steps

```bash
# 1. Clone and install dependencies
git clone https://github.com/marcusdax/field-commander.git
cd field-commander
npm install

# 2. Create environment files from examples
cp backend/.env.example backend/.env
cp edge-substrate/.env.example edge-substrate/.env
cp blockchain/.env.example blockchain/.env
cp mobile-app/.env.example mobile-app/.env

# 3. Start PostgreSQL and Redis
docker-compose up -d postgres redis

# 4. Run database migrations
npm run migrate:backend
npm run migrate:edge

# 5. Seed test data (optional)
npm run docker:seed

# 6. Build all services
npm run build

# 7. Start development servers
npm run backend      # Terminal 1: http://localhost:3001
npm run edge        # Terminal 2: http://localhost:3002
npm run web         # Terminal 3: http://localhost:3000
npm run mobile      # Terminal 4: React Native dev server
```

### Verify Setup
```bash
# Check backend health
curl http://localhost:3001/health

# Check edge-substrate health
curl http://localhost:3002/health

# Run E2E tests
npm run e2e:local
```

---

## Production Deployment

### Phase 1: Preparation

#### 1.1 Environment Configuration
Create production `.env` files with actual values:

**backend/.env (production)**
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com

DB_HOST=prod-postgres-host
DB_PORT=5432
DB_NAME=field_commander_prod
DB_USER=fc_admin
DB_PASSWORD=${DB_PASSWORD_SECRET}
DB_SSL=true

REDIS_HOST=prod-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD_SECRET}

CHAIN_MOCK=false
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_MAINNET_RPC=https://polygon-rpc.com
BACKEND_SIGNER_KEY=${BACKEND_SIGNER_KEY_SECRET}
EVIDENCE_LEDGER_ADDRESS=0x...
DTA_CONTRACT_ADDRESS=0x...

EDGE_SUBSTRATE_URL=https://edge.yourdomain.com
```

**blockchain/.env (deployment)**
```env
NODE_ENV=production
DEPLOYER_PRIVATE_KEY=${DEPLOYER_KEY_SECRET}
POLYGON_MAINNET_RPC=https://polygon-rpc.com
POLYGONSCAN_API_KEY=${POLYGONSCAN_API_KEY_SECRET}
```

#### 1.2 Infrastructure Setup

```bash
# Create cloud resources (AWS/GCP/Azure)
# 1. PostgreSQL managed database
# 2. Redis managed cache
# 3. Kubernetes cluster or container orchestration
# 4. Load balancer / API Gateway
# 5. SSL certificates
```

---

### Phase 2: Smart Contract Deployment

#### 2.1 Deploy to Polygon Testnet (Amoy)
```bash
# Verify .env configuration
cat blockchain/.env | grep POLYGON_AMOY

# Run deployment
npm run deploy:contract:amoy --workspace=blockchain

# Output will show:
# - EvidenceLedger address
# - CitizenLedgerDTA address
# - Deployment manifest saved to blockchain/deployments/amoy.json

# Save these addresses to your production backend .env
```

#### 2.2 Deploy to Polygon Mainnet
```bash
# ⚠️ WARNING: Real MATIC will be used for gas!

# 1. Update blockchain/.env with mainnet values
# 2. Run deployment
npm run deploy:contract:polygon --workspace=blockchain

# 3. Verify contracts on Polygonscan
# https://polygonscan.com/address/0x...

# 4. Update backend .env with mainnet contract addresses
```

---

### Phase 3: Backend Service Deployment

#### 3.1 Build Docker Image
```bash
docker build -t field-commander-backend:latest ./backend
docker tag field-commander-backend:latest myregistry.azurecr.io/field-commander-backend:latest
docker push myregistry.azurecr.io/field-commander-backend:latest
```

#### 3.2 Run Database Migrations
```bash
# In production container or via connection:
npm run migrate:backend

# Verify migration ran:
# SELECT * FROM agents;
# SELECT * FROM recoveries;
```

#### 3.3 Deploy to Kubernetes
```bash
# Update kubernetes manifests with image tag
kubectl apply -f k8s/backend-deployment.yaml

# Verify rollout
kubectl rollout status deployment/field-commander-backend
kubectl get pods -l app=field-commander-backend

# Check logs
kubectl logs -l app=field-commander-backend --tail=100
```

---

### Phase 4: Edge Substrate Service Deployment

#### 4.1 Build and Deploy
```bash
# Build Docker image
docker build -t field-commander-edge:latest ./edge-substrate
docker push myregistry.azurecr.io/field-commander-edge:latest

# Deploy to Kubernetes
kubectl apply -f k8s/edge-deployment.yaml

# Verify
kubectl rollout status deployment/field-commander-edge
```

#### 4.2 Run Migrations
```bash
npm run migrate:edge
```

---

### Phase 5: Web Client Deployment

#### 5.1 Build Static Site
```bash
npm run build:web

# Output: web-client/build/
```

#### 5.2 Deploy to CDN
```bash
# Option 1: AWS S3 + CloudFront
aws s3 sync web-client/build/ s3://field-commander-prod/ --delete

# Option 2: Azure Static Web Apps
az storage blob upload-batch -d '$web' -s web-client/build -d myapp

# Option 3: GitHub Pages
npm run gh-pages -- -d web-client/build
```

---

### Phase 6: Mobile App Deployment

#### 6.1 iOS Deployment
```bash
# Build
npm run build:ios --workspace=mobile-app

# Sign and upload to App Store
# See: https://reactnative.dev/docs/signed-apk-android

# Steps:
# 1. Update VERSION in ios/FieldCommander/Info.plist
# 2. Code sign with Apple Developer certificate
# 3. Submit to App Store Connect
```

#### 6.2 Android Deployment
```bash
# Build
npm run build:android --workspace=mobile-app

# Output: mobile-app/android/app/build/outputs/bundle/release/

# Sign APK
cd mobile-app
./gradlew assembleRelease

# Upload to Google Play Console
# https://developer.android.com/distribute/console
```

---

## Monitoring & Health Checks

### Health Endpoints
```bash
# Backend
curl https://api.yourdomain.com/health

# Edge-Substrate
curl https://edge.yourdomain.com/health
```

### Logs
```bash
# Kubernetes logs
kubectl logs deployment/field-commander-backend -f

# Database logs
SELECT * FROM pg_stat_activity WHERE datname = 'field_commander_prod';
```

### Metrics to Monitor
- HTTP request latency (target: <500ms)
- Database connection pool usage
- Redis memory utilization
- Smart contract gas costs
- WebSocket connection count
- Error rates and 5xx responses

---

## Rollback Procedure

### If Issues Occur

```bash
# Kubernetes rollback
kubectl rollout history deployment/field-commander-backend
kubectl rollout undo deployment/field-commander-backend --to-revision=1

# Docker image rollback
docker tag myregistry.azurecr.io/field-commander-backend:v1.0.0 myregistry.azurecr.io/field-commander-backend:latest
docker push myregistry.azurecr.io/field-commander-backend:latest

# Smart contract rollback
# Note: Cannot rollback deployed contracts on blockchain
# Must deploy new contracts and update EVIDENCE_LEDGER_ADDRESS in backend .env
```

---

## Verification Checklist

- [ ] All services start without errors
- [ ] Database migrations complete successfully
- [ ] Health checks pass on all services
- [ ] Smart contracts deployed and verified
- [ ] Environment variables set correctly
- [ ] No hardcoded secrets in code or logs
- [ ] Load balancer routing to all instances
- [ ] SSL certificates valid
- [ ] Database backups configured
- [ ] Monitoring and alerting operational
- [ ] Disaster recovery plan in place
- [ ] E2E tests pass in production environment

---

## Troubleshooting

### Issue: Backend won't start - Missing environment variables
```
Solution: Check backend/.env has all required vars
npm run test:env --workspace=backend
```

### Issue: Database migration fails
```
Solution: Check database connection and user permissions
npm run migrate:backend -- --verbose
```

### Issue: Smart contract deployment fails
```
Solution: Verify wallet has sufficient gas and is on correct network
npm run deploy:contract:amoy -- --verbose
```

### Issue: WebSocket connections fail
```
Solution: Check CORS_ORIGIN and firewall rules
curl -H "Upgrade: websocket" https://api.yourdomain.com
```

---

## Support

For issues, see [DEPLOYMENT_AUDIT.md](./DEPLOYMENT_AUDIT.md) for detailed analysis.
