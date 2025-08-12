# Deployment Guide for Bulldøk Climbing Club App

This guide provides comprehensive instructions for deploying the climbing club application to various hosting platforms.

## Prerequisites

- Node.js (v14 or later)
- Git repository with your code
- Updated admin credentials for security

## 🔒 **CRITICAL: Security Setup**

**⚠️ CHANGE THE ADMIN PASSWORD BEFORE DEPLOYMENT!**

### Method 1: Environment Variable (Recommended)
Set `ADMIN_PASSWORD` environment variable on your hosting platform:
```bash
ADMIN_PASSWORD=YourSecurePasswordHere123!
```

### Method 2: Update Source Code
In `public/app.js`, line 8:
```javascript
const adminPassword = window.ADMIN_PASSWORD || 'YourSecurePasswordHere123!'
```

## Deployment Options

### 🚀 Option 1: Railway (Recommended - Easiest)

1. **Create account**: Visit https://railway.app
2. **Connect GitHub**: Link your repository
3. **Deploy**: Railway auto-detects Node.js setup
4. **Environment variables**:
   - Go to Variables tab
   - Add: `ADMIN_PASSWORD=YourSecurePasswordHere123!`
5. **Custom domain**: Available in dashboard settings

**Pros**: Automatic deployments, easy setup, good performance
**Cons**: Usage-based pricing after free tier

### 🆓 Option 2: Render (Free Tier Available)

1. **Create account**: Visit https://render.com
2. **New Web Service**: Connect your GitHub repository
3. **Configuration**:
   - **Name**: climbing-club-app
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: 18 (or latest)
4. **Environment Variables**:
   - `ADMIN_PASSWORD=YourSecurePasswordHere123!`
   - `NODE_ENV=production`

**Pros**: Free tier available, simple setup
**Cons**: Cold starts on free tier, slower performance

### ⚡ Option 3: Heroku

1. **Install Heroku CLI**: Download from heroku.com
2. **Login**: `heroku login`
3. **Create app**: `heroku create your-climbing-club-app`
4. **Set environment variables**:
   ```bash
   heroku config:set ADMIN_PASSWORD=YourSecurePasswordHere123!
   heroku config:set NODE_ENV=production
   ```
5. **Deploy**: `git push heroku main`

**Pros**: Mature platform, extensive documentation
**Cons**: No free tier, monthly costs

### 🌊 Option 4: DigitalOcean App Platform

1. **Create DigitalOcean account**
2. **Apps → Create App**
3. **Connect GitHub repository**
4. **Configuration**:
   - **Resource Type**: Web Service
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **HTTP Port**: 3000
5. **Environment Variables**:
   - `ADMIN_PASSWORD=YourSecurePasswordHere123!`

**Pros**: Predictable pricing, good performance, developer-friendly
**Cons**: Requires payment method

### ⚡ Option 5: Vercel (Serverless)

**Note**: Best for static sites. Current app uses traditional server.
1. **Create account**: Visit vercel.com
2. **Import repository**: Connect GitHub
3. **Framework**: Choose Other
4. **Deploy**: Vercel uses `vercel.json` configuration

## 🛠 Local Development

### Setup
```bash
# Clone repository
git clone https://github.com/yourusername/climbing-club-app
cd climbing-club-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access
- **Application**: http://localhost:3000
- **Admin Login**: Click "Admin" button, use configured password

## 🎯 Production Configuration

### Required Environment Variables
```bash
NODE_ENV=production
ADMIN_PASSWORD=YourSecurePasswordHere123!
PORT=3000  # Usually auto-set by hosting platform
```

### Data Persistence
- Uses JSON file storage: `data/climbclub.json`
- Automatically creates sample data on first run
- Most platforms support persistent file storage
- Consider database migration for large deployments

## 🛡 Security Checklist

- [ ] **Change admin password** (default is weak)
- [ ] **Set ADMIN_PASSWORD environment variable**
- [ ] **Enable HTTPS** (automatic on most platforms)
- [ ] **Review CORS settings** in `server.js`
- [ ] **Set up data backups**
- [ ] **Monitor access logs**

## 📊 Features Available After Deployment

### Admin Features (requires login)
- Add/edit/delete climbing sessions
- Add/edit/delete club members
- Track attendance for each session
- Generate reports and statistics
- Export data (JSON, CSV formats)
- Import existing data

### Public Features
- View upcoming climbing sessions
- Browse member directory
- Check session details and availability

## 🔧 Troubleshooting

### Common Issues
1. **"Port already in use"**: App uses `process.env.PORT || 3000`
2. **"Cannot write to data directory"**: Check file permissions
3. **"Dependencies not found"**: Ensure `package.json` is complete
4. **"Admin login not working"**: Verify password is set correctly

### Debugging Steps
1. **Check logs**: Platform-specific log viewing
   - Railway: Deployments → View Logs
   - Render: Logs tab in dashboard
   - Heroku: `heroku logs --tail`
2. **Verify environment variables**: Check platform settings
3. **Test locally**: Run `npm start` locally first

### Log Analysis
```bash
# Common log patterns to look for:
# ✅ "Server running on port 3000"
# ✅ "Data directory created"
# ❌ "EACCES: permission denied"
# ❌ "Module not found"
```

## 💾 Backup Strategy

### Automated Backup (via Admin Panel)
1. Login as admin
2. Go to "Admin Tools" section
3. Click "Export JSON" - saves complete database
4. Store exported files securely

### Manual Backup
- Download `data/climbclub.json` file
- Save exported CSV files
- Consider cloud storage integration

### Recommended Backup Schedule
- **Weekly**: Full JSON export
- **Monthly**: Archive old sessions
- **Before updates**: Always backup before deploying changes

## 🎯 Performance Optimization

### Production Settings
- File-based database is suitable for small-medium clubs (< 1000 members)
- Consider PostgreSQL/MongoDB for larger deployments
- Enable gzip compression (included in setup)
- Use CDN for static assets if needed

## 📞 Support & Maintenance

### Regular Tasks
- [ ] Weekly data backups
- [ ] Monthly security updates (`npm audit`)
- [ ] Quarterly password rotation
- [ ] Monitor hosting platform usage

### Getting Help
1. Check hosting platform documentation
2. Review application logs for specific errors
3. Test changes locally before deploying
4. Keep backups before making changes

---

**Quick Start Summary:**
1. 🔒 Change admin password
2. 🚀 Choose hosting platform (Railway recommended)
3. 🔗 Connect GitHub repository
4. ⚙️ Set environment variables
5. 🚀 Deploy and test!

*Total deployment time: 10-15 minutes*

## Security

For production deployment:

1. Change the admin password in `public/app.js`
2. Consider implementing proper authentication
3. Set up HTTPS
4. Configure proper CORS settings if needed
