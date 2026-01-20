# Deployment Guide

This guide covers deploying the Christ's Reformation House website to various platforms.

## Prerequisites

- Node.js 16+ installed
- Git repository set up
- Domain name (optional)

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

## Deployment Options

### 1. Vercel (Recommended for Frontend)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Or connect your GitHub repository to Vercel for automatic deployments.

### 2. Netlify

1. Install Netlify CLI:
```bash
npm i -g netlify-cli
```

2. Build and deploy:
```bash
npm run build
netlify deploy --prod
```

3. Or connect your GitHub repository to Netlify.

### 3. Firebase Hosting

1. Install Firebase CLI:
```bash
npm i -g firebase-tools
```

2. Login:
```bash
firebase login
```

3. Initialize:
```bash
firebase init hosting
```

4. Build and deploy:
```bash
npm run build
firebase deploy
```

### 4. Traditional Web Server (Apache/Nginx)

1. Build the project:
```bash
npm run build
```

2. Copy the `dist` folder contents to your web server's public directory.

3. Configure your server to serve `index.html` for all routes (for React Router).

#### Nginx Configuration Example:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/crh-website/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Apache Configuration Example (.htaccess):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## Backend Deployment

### Option 1: Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Deploy: `git push heroku main`
5. Set environment variables in Heroku dashboard

### Option 2: Railway

1. Connect your GitHub repository
2. Railway will auto-detect Node.js
3. Set environment variables
4. Deploy automatically on push

### Option 3: DigitalOcean / AWS / Azure

1. Set up a Node.js server
2. Install PM2: `npm install -g pm2`
3. Start server: `pm2 start backend/server.js`
4. Set up reverse proxy (Nginx)
5. Configure SSL certificate (Let's Encrypt)

## Environment Variables

Set these in your deployment platform:

### Frontend (.env)
```
VITE_API_URL=https://your-api-domain.com/api
VITE_PAYMENT_GATEWAY_KEY=your_payment_key
```

### Backend (.env)
```
PORT=5000
FLW_SECRET_KEY=your_flutterwave_secret_key
NODE_ENV=production
```

## Post-Deployment Checklist

- [ ] Test all pages and routes
- [ ] Verify API connections
- [ ] Test payment integration
- [ ] Check mobile responsiveness
- [ ] Verify SSL certificate
- [ ] Set up monitoring (Sentry, LogRocket, etc.)
- [ ] Configure backups
- [ ] Set up analytics (Google Analytics)
- [ ] Test contact forms
- [ ] Verify email notifications

## Continuous Deployment

For automatic deployments:

1. Connect your Git repository to your hosting platform
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Set environment variables
4. Enable automatic deployments on push to main branch

## Troubleshooting

### Routes not working
- Ensure your server is configured to serve `index.html` for all routes
- Check React Router configuration

### API calls failing
- Verify CORS settings in backend
- Check API URL in environment variables
- Ensure backend is accessible

### Images not loading
- Verify assets are in `public` folder
- Check image paths in components
- Ensure public folder is included in build




