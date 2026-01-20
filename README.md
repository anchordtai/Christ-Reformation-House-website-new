# Christ's Reformation House International - Church Website

A modern, responsive church website built with React.js, featuring all essential church application features.

## Features

- **Home Page** - Welcome page with hero section, stats, and mission statement
- **About Us** - Church history, values, and leadership information
- **Sermons** - Browse and watch/listen to sermon messages
- **Events** - View and register for upcoming church events
- **Blog** - Read inspiring articles and devotionals
- **Daily Devotional** - Daily Bible readings and reflections
- **Donations** - Online giving with multiple donation types
- **Prayer Requests** - Submit and manage prayer requests
- **Ministries** - Explore various church ministries
- **Church Store** - Online store for books, apparel, and resources
- **Contact** - Get in touch with the church
- **User Authentication** - Login and signup functionality

## Technology Stack

- **React 18** - Modern UI library
- **React Router** - Client-side routing
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client for API calls
- **date-fns** - Date utility library

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. **Copy assets to public folder** (if not already done):
   - Copy the `assets` folder to the `public` directory
   - The structure should be: `public/assets/img/...`, `public/assets/js/...`, etc.

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
  ├── components/     # Reusable components (Header, Footer)
  ├── pages/         # Page components
  ├── App.jsx        # Main app component with routing
  ├── main.jsx       # Entry point
  └── index.css      # Global styles
```

## Features in Detail

### Responsive Design
- Mobile-first approach
- Fully responsive across all devices
- Modern, clean UI with smooth animations

### Navigation
- Sticky header with mobile menu
- Breadcrumb navigation
- Smooth page transitions

### Forms
- Contact form
- Prayer request form
- Event registration
- Donation form
- User authentication

### Content Management
- Sermon library with search
- Blog posts with categories
- Daily devotionals
- Event calendar

## Backend Integration

The application includes a complete backend API server in the `backend` folder. The frontend uses a service layer (`src/services/api.js`) that connects to the backend.

### Starting the Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
PORT=5000
FLW_SECRET_KEY=your_flutterwave_secret_key
NODE_ENV=development
```

4. Start the server:
```bash
npm start
```

The backend API will run on `http://localhost:5000`

### API Services

The application includes pre-configured API services for:
- Authentication (login/signup)
- Sermons management
- Events and registrations
- Blog posts
- Devotionals
- Donations and payment verification
- Prayer requests
- Contact messages
- Church store

All API calls are handled through the service layer with automatic error handling and loading states.

## Environment Variables

Create a `.env` file in the root directory:

```
VITE_API_URL=http://localhost:5000/api
VITE_PAYMENT_GATEWAY_KEY=your_payment_gateway_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email info@reformationhouse.org or contact us through the website.
