# Degas CS - Deployment Guide

This guide covers deploying GateKeeper HQ to production environments.

## 🚀 Render.com Deployment (Recommended)

Render.com provides an easy, cost-effective way to deploy the full stack application.

### Prerequisites

- GitHub repository with your GateKeeper HQ code
- Render.com account (free tier available)

### Automatic Deployment

1. **Fork/Clone Repository**
   ```bash
   git clone <your-repo-url>
   cd gatekeeper-hq
   ```

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Degas ACS"
   git push origin main
   ```

3. **Deploy to Render**
   - Go to [render.com](https://render.com) and sign in
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository containing GateKeeper HQ
   - Render will automatically detect the `render.yaml` file
   - Click "Apply" to start deployment

### Manual Deployment

If you prefer manual setup:

#### 1. Database Setup
- Create a PostgreSQL service
- Note the connection string for later

#### 2. Backend Deployment
- Create a new Web Service
- Connect your GitHub repository
- Configure:
  ```
  Build Command: npm install && cd backend && npm install && cd ../shared && npm install && npm run build && cd ../backend && npm run build
  Start Command: cd backend && npm start
  ```
- Add environment variables:
  ```
  NODE_ENV=production
  DATABASE_URL=<your-postgres-connection-string>
  JWT_SECRET=<generate-strong-secret>
  QR_SECRET=<generate-strong-secret>
  PORT=10000
  ```

#### 3. Frontend Deployment
- Create a Static Site service
- Connect your GitHub repository
- Configure:
  ```
  Build Command: npm install && cd frontend && npm install && cd ../shared && npm install && npm run build && cd ../frontend && npm run build
  Publish Directory: frontend/dist
  ```
- Add environment variables:
  ```
  VITE_API_URL=https://your-backend-url.onrender.com/api
  ```

#### 4. Database Migration
After backend deployment:
- Go to your backend service shell
- Run: `npm run migrate`
- Run: `npm run seed`

## 🐳 Docker Deployment

### Using Docker Compose

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   
   services:
     postgres:
       image: postgres:15
       environment:
         POSTGRES_DB: gatekeeper_hq
         POSTGRES_USER: gatekeeper
         POSTGRES_PASSWORD: your_password
       volumes:
         - postgres_data:/var/lib/postgresql/data
       ports:
         - "5432:5432"
   
     backend:
       build:
         context: .
         dockerfile: backend/Dockerfile
       environment:
         NODE_ENV: production
         DATABASE_URL: postgresql://gatekeeper:your_password@postgres:5432/gatekeeper_hq
         JWT_SECRET: your_jwt_secret
         QR_SECRET: your_qr_secret
       ports:
         - "3001:3001"
       depends_on:
         - postgres
   
     frontend:
       build:
         context: .
         dockerfile: frontend/Dockerfile
       environment:
         VITE_API_URL: http://localhost:3001/api
       ports:
         - "80:80"
       depends_on:
         - backend
   
   volumes:
     postgres_data:
   ```

2. **Create Dockerfiles**

   **backend/Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   # Copy package files
   COPY package*.json ./
   COPY backend/package*.json ./backend/
   COPY shared/package*.json ./shared/
   
   # Install dependencies
   RUN npm install
   RUN cd backend && npm install
   RUN cd shared && npm install
   
   # Copy source code
   COPY . .
   
   # Build shared package
   RUN cd shared && npm run build
   
   # Build backend
   RUN cd backend && npm run build
   
   EXPOSE 3001
   
   CMD ["npm", "run", "start:backend"]
   ```

   **frontend/Dockerfile:**
   ```dockerfile
   FROM node:18-alpine as builder
   
   WORKDIR /app
   
   # Copy package files
   COPY package*.json ./
   COPY frontend/package*.json ./frontend/
   COPY shared/package*.json ./shared/
   
   # Install dependencies
   RUN npm install
   RUN cd frontend && npm install
   RUN cd shared && npm install
   
   # Copy source code
   COPY . .
   
   # Build shared package
   RUN cd shared && npm run build
   
   # Build frontend
   RUN cd frontend && npm run build
   
   # Production stage
   FROM nginx:alpine
   COPY --from=builder /app/frontend/dist /usr/share/nginx/html
   COPY frontend/nginx.conf /etc/nginx/nginx.conf
   
   EXPOSE 80
   
   CMD ["nginx", "-g", "daemon off;"]
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

## ☁️ AWS Deployment

### Using AWS Elastic Beanstalk

1. **Prepare Application**
   ```bash
   # Create deployment package
   npm run build
   zip -r gatekeeper-hq.zip . -x "node_modules/*" "*.git*"
   ```

2. **Create Elastic Beanstalk Application**
   - Go to AWS Elastic Beanstalk console
   - Create new application
   - Choose Node.js platform
   - Upload your zip file

3. **Configure Environment Variables**
   ```
   NODE_ENV=production
   DATABASE_URL=your_rds_connection_string
   JWT_SECRET=your_jwt_secret
   QR_SECRET=your_qr_secret
   ```

4. **Set up RDS Database**
   - Create PostgreSQL RDS instance
   - Update DATABASE_URL with RDS connection string

## 🔧 Environment Variables

### Required Variables

**Backend:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-super-secret-jwt-key
QR_SECRET=your-qr-signing-secret
PORT=3001
UPLOAD_DIR=/tmp/uploads
MAX_FILE_SIZE=10485760
```

**Frontend:**
```env
VITE_API_URL=https://your-backend-domain.com/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Generating Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate QR secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🔒 Security Considerations

### Production Checklist

- [ ] Use HTTPS in production
- [ ] Set strong JWT and QR secrets
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable database SSL
- [ ] Configure proper file upload limits
- [ ] Set up monitoring and logging
- [ ] Regular security updates

### HTTPS Setup

For Render.com, HTTPS is automatic. For other platforms:

1. **Let's Encrypt (Free)**
   ```bash
   # Using Certbot
   sudo certbot --nginx -d yourdomain.com
   ```

2. **Cloudflare (Free)**
   - Add your domain to Cloudflare
   - Enable SSL/TLS encryption

## 📊 Monitoring

### Health Checks

The backend includes a health check endpoint:
```
GET /api/health
```

### Logging

Logs are available in:
- Render: Service logs in dashboard
- Docker: `docker-compose logs`
- AWS: CloudWatch logs

### Performance Monitoring

Consider adding:
- Application Performance Monitoring (APM)
- Database monitoring
- Error tracking (Sentry)
- Uptime monitoring

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm run install:all
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to Render
        # Render auto-deploys on git push
        run: echo "Deployment triggered"
```

## 🚨 Troubleshooting

### Common Issues

**Build Failures:**
- Check Node.js version (18+ required)
- Verify all dependencies are installed
- Check for TypeScript errors

**Database Connection:**
- Verify DATABASE_URL format
- Check database server status
- Ensure SSL settings match

**CORS Errors:**
- Update CORS configuration in backend
- Verify frontend URL in CORS settings

**QR Scanner Not Working:**
- Ensure HTTPS in production
- Check camera permissions
- Verify browser compatibility

### Getting Help

- Check service logs for error details
- Verify environment variables
- Test API endpoints directly
- Check database connectivity

---

**Need help?** Create an issue in the repository with your deployment details and error messages.