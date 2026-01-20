# Setup Guide

Complete setup instructions for Christ's Reformation House website.

## Initial Setup

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment Variables

#### Frontend (.env in root)
```env
VITE_API_URL=http://localhost:5000/api
VITE_PAYMENT_GATEWAY_KEY=your_payment_gateway_key
```

#### Backend (.env in backend folder)
```env
PORT=5000
FLW_SECRET_KEY=your_flutterwave_secret_key
NODE_ENV=development
```

### 3. Verify Assets

Ensure the `assets` folder is copied to `public/assets`. If not:

```bash
# Windows
Copy-Item -Path assets -Destination public\assets -Recurse -Force

# Mac/Linux
cp -r assets public/assets
```

### 4. Start Development Servers

#### Terminal 1 - Frontend
```bash
npm run dev
```

#### Terminal 2 - Backend
```bash
cd backend
npm start
```

The frontend will be available at `http://localhost:3000`
The backend API will be available at `http://localhost:5000`

## Project Structure

```
crh-website/
├── public/
│   └── assets/          # Images and static assets
├── src/
│   ├── components/      # Reusable React components
│   ├── pages/          # Page components
│   ├── services/       # API service layer
│   ├── hooks/          # Custom React hooks
│   ├── utils/           # Utility functions and constants
│   ├── App.jsx         # Main app component
│   └── main.jsx        # Entry point
├── backend/
│   ├── server.js       # Express server
│   └── *.json          # Data files (created at runtime)
└── package.json        # Frontend dependencies
```

## Features Implemented

✅ **Complete React Application**
- Modern React 18 with Vite
- React Router for navigation
- Responsive design with Tailwind CSS

✅ **All Essential Pages**
- Home, About, Sermons, Events
- Blog, Devotional, Donate
- Contact, Prayer Request
- Ministries, Church Store
- Login/Signup

✅ **Backend API**
- RESTful API with Express
- Authentication endpoints
- CRUD operations for all resources
- Payment verification (Flutterwave)

✅ **Advanced Features**
- API service layer
- Custom hooks for data fetching
- Error handling and loading states
- Form validation
- Search functionality

## Next Steps

1. **Configure Payment Gateway**
   - Set up Flutterwave account
   - Add secret key to backend `.env`
   - Test donation flow

2. **Add Real Data**
   - Replace sample data with real content
   - Set up database (MongoDB, PostgreSQL, etc.)
   - Migrate from JSON files to database

3. **Customize Content**
   - Update church information in `src/utils/constants.js`
   - Replace placeholder images
   - Add real sermon/blog content

4. **Deploy**
   - Follow instructions in `DEPLOYMENT.md`
   - Choose hosting platform
   - Set up environment variables
   - Configure domain and SSL

## Troubleshooting

### Images not loading
- Verify assets are in `public/assets`
- Check image paths in components
- Clear browser cache

### API calls failing
- Ensure backend server is running
- Check CORS configuration
- Verify API URL in `.env`

### Build errors
- Clear `node_modules` and reinstall
- Check Node.js version (16+)
- Verify all dependencies are installed

## Support

For issues or questions, refer to:
- `README.md` - General information
- `DEPLOYMENT.md` - Deployment guide
- Backend `README.md` - Backend-specific docs




