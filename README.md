 # Bulldok Climbing Club Management System

A web-based application for managing climbing club sessions, members, and attendance tracking. Now enhanced with backend API support for web hosting deployment.

## Features

- 📅 Session management with scheduling and capacity tracking
- 👥 Member registration with climbing grades and certifications
- ✅ Attendance tracking and reporting
- 📊 Statistics and reports
- 🌙 Dark/light theme support
- 📱 Responsive mobile-friendly design
- 🔐 Admin authentication for protected actions
- 💾 Server-side data persistence with JSON file database
- 🚀 Ready for deployment to web hosting services

## Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Local Development

1. **Install Node.js** (if not already installed):
   - Download from [nodejs.org](https://nodejs.org/)
   - Follow the installation instructions for your operating system

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize sample data** (automatic on first run):
   ```bash
   npm run postinstall
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

5. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

## Web Hosting Deployment

This application is now ready for deployment to various hosting services:

### Heroku
```bash
# Install Heroku CLI, then:
heroku create your-app-name
git push heroku main
```

### Railway
1. Connect your GitHub repository to Railway
2. Deploy automatically with zero configuration

### Render
1. Connect your GitHub repository 
2. Build Command: `npm install`
3. Start Command: `npm start`

### Vercel
1. Connect your GitHub repository
2. Uses included `vercel.json` configuration

See `DEPLOYMENT.md` for detailed deployment instructions.

## Data Storage

The application now uses a server-side JSON file database instead of localStorage:

- **Development**: Data stored in `data/climbclub.json`
- **Production**: Data persists on the server filesystem
- **Backup**: Use the export features in the admin panel

## Admin Access

Admin password must be declared as an environment variable when deoplying.

**⚠️ IMPORTANT**: Change this password in `public/app.js` before deploying to production!

## API Endpoints

The application provides a REST API for data management:

- `GET /api/data` - Get all data
- `PUT /api/data` - Update all data
- `GET/POST/PUT/DELETE /api/sessions` - Session management
- `GET/POST/PUT/DELETE /api/members` - Member management
- `PUT/DELETE /api/attendance/:sessionId/:memberId` - Attendance tracking

## File Structure

```
├── server.js           # Express.js server
├── init-data.js        # Sample data initialization
├── package.json        # Dependencies and scripts
├── public/            # Frontend files
│   ├── index.html     # Main application
│   ├── app.js         # Client-side JavaScript (API-based)
│   └── assets/        # Images and icons
├── data/              # Database directory
│   └── climbclub.json # JSON database file
├── DEPLOYMENT.md      # Deployment instructions
└── README.md          # This file
```

## Development vs Production

**Development Features:**
- Nodemon for auto-restart
- Detailed error logging
- Sample data generation

**Production Features:**
- Security headers with Helmet
- Rate limiting
- CORS configuration
- Optimized static file serving

## Migration from localStorage Version

If you have data in the old localStorage version:

1. Open the old version in your browser
2. Use "Export JSON" to download your data
3. In the new version, use "Import JSON" to upload the data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on the GitHub repository.
