const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'climbclub.json');

// Environment variables (for development, we'll use defaults)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'demo_client_id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'demo_client_secret';
const SESSION_SECRET = process.env.SESSION_SECRET || 'bulldok-climbing-club-secret-change-in-production';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname)); // Serve static files from root directory

// Session configuration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const data = await readData();
    const member = data.members.find(m => m.id === id);
    done(null, member);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const data = await readData();
    
    // Find member by email
    const member = data.members.find(m => m.email === profile.emails[0].value);
    
    if (member) {
      // Update member with Google profile info if needed
      member.googleId = profile.id;
      member.profilePicture = profile.photos[0]?.value;
      await writeData(data);
      
      return done(null, member);
    } else {
      // Member not found - they need to be registered first
      return done(null, false, { message: 'No member found with this email. Please register first.' });
    }
  } catch (error) {
    return done(error, null);
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.access(path.join(__dirname, 'data'));
  } catch {
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
  }
}

// Database functions
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return default structure
    return {
      members: [],
      sessions: [],
      attendance: {},
      _seq: 1
    };
  }
}

async function writeData(data) {
  await ensureDataDirectory();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function generateId(data) {
  const id = data._seq;
  data._seq += 1;
  return String(id);
}

// API Routes

// Authentication Routes

// Development test login (simulates Google OAuth)
app.get('/auth/test-login/:email', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Test login not available in production' });
  }
  
  try {
    const { email } = req.params;
    const data = await readData();
    
    // Find member by email
    const member = data.members.find(m => m.email === email);
    
    if (member) {
      // Simulate passport login
      req.login(member, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Login failed' });
        }
        res.redirect('/?login=success');
      });
    } else {
      res.redirect('/login-failed');
    }
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ error: 'Test login failed' });
  }
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failed' }),
  (req, res) => {
    // Successful authentication
    res.redirect('/?login=success');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.redirect('/?logout=success');
  });
});

app.get('/api/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        profilePicture: req.user.profilePicture
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

app.get('/login-failed', (req, res) => {
  res.send(`
    <html>
      <head><title>Login Failed</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>Login Failed</h1>
        <p>No member found with this email address.</p>
        <p>Please make sure you're registered as a member first.</p>
        <a href="/" style="color: #3B82F6;">Go back to main page</a>
      </body>
    </html>
  `);
});

// Development test login endpoint
app.get('/auth/test-login/:email', async (req, res) => {
  const { email } = req.params;
  
  try {
    const data = await readData();
    const member = data.members.find(m => m.email === decodeURIComponent(email));
    
    if (member) {
      // Simulate successful login
      req.login(member, (err) => {
        if (err) {
          return res.status(500).send('Login error');
        }
        res.redirect('/?login=success');
      });
    } else {
      res.redirect('/login-failed');
    }
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).send('Login error');
  }
});

// Get all data
app.get('/api/data', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Update all data (for import/bulk updates)
app.put('/api/data', async (req, res) => {
  try {
    const data = req.body;
    // Ensure required structure
    if (!data.members) data.members = [];
    if (!data.sessions) data.sessions = [];
    if (!data.attendance) data.attendance = {};
    if (!data._seq) data._seq = 1;
    
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing data:', error);
    res.status(500).json({ error: 'Failed to write data' });
  }
});

// Validation functions
function validateSession(session) {
  const required = ['date', 'location', 'start', 'end', 'discipline'];
  for (const field of required) {
    if (!session[field] || (typeof session[field] === 'string' && !session[field].trim())) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }
  
  // Validate time format
  if (!/^\d{2}:\d{2}$/.test(session.start) || !/^\d{2}:\d{2}$/.test(session.end)) {
    throw new Error('Invalid time format. Use HH:MM');
  }
  
  // Validate capacity
  if (session.capacity && (!Number.isInteger(session.capacity) || session.capacity < 0)) {
    throw new Error('Capacity must be a non-negative integer');
  }
}

function validateMember(member) {
  if (!member.name || !member.name.trim()) {
    throw new Error('Member name is required');
  }
  
  if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
    throw new Error('Invalid email format');
  }
}

// Sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const data = await readData();
    
    // Enhance sessions with registration information
    const enhancedSessions = data.sessions.map(session => {
      const sessionAttendance = data.attendance[session.id] || {};
      const sessionRegistrations = data.registrations[session.id] || [];
      
      // Get registered members (from registrations data)
      const registrations = sessionRegistrations.map(memberId => {
        const member = data.members.find(m => m.id === memberId);
        return member ? member.name : `Unknown Member (${memberId})`;
      });
      
      // Get attended members (from attendance data, only those with true values)
      const attendedMemberIds = Object.keys(sessionAttendance).filter(
        memberId => sessionAttendance[memberId] === true
      );
      const attendance = attendedMemberIds.map(memberId => {
        const member = data.members.find(m => m.id === memberId);
        return member ? member.name : `Unknown Member (${memberId})`;
      });
      
      return {
        ...session,
        registrations: registrations,
        attendance: attendance
      };
    });
    
    res.json(enhancedSessions);
  } catch (error) {
    console.error('Error reading sessions:', error);
    res.status(500).json({ error: 'Failed to read sessions' });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    validateSession(req.body);
    const data = await readData();
    const session = {
      ...req.body,
      id: await generateId(data)
    };
    data.sessions.push(session);
    await writeData(data);
    res.json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/sessions/:id', async (req, res) => {
  try {
    validateSession(req.body);
    const data = await readData();
    const sessionIndex = data.sessions.findIndex(s => s.id === req.params.id);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }
    data.sessions[sessionIndex] = { ...req.body, id: req.params.id };
    await writeData(data);
    res.json(data.sessions[sessionIndex]);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const data = await readData();
    data.sessions = data.sessions.filter(s => s.id !== req.params.id);
    delete data.attendance[req.params.id];
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Members
app.get('/api/members', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.members);
  } catch (error) {
    console.error('Error reading members:', error);
    res.status(500).json({ error: 'Failed to read members' });
  }
});

// Session registration endpoints
app.post('/api/sessions/:sessionId/register', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'You must be logged in to register for sessions' });
  }

  try {
    const { sessionId } = req.params;
    const memberId = req.user.id;
    const data = await readData();

    // Check if session exists
    const session = data.sessions.find(s => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Initialize attendance if not exists
    if (!data.attendance[sessionId]) {
      data.attendance[sessionId] = {};
    }

    // Check if already registered
    if (data.attendance[sessionId][memberId] !== undefined) {
      return res.status(400).json({ error: 'Already registered for this session' });
    }

    // Check capacity
    const registeredCount = Object.keys(data.attendance[sessionId]).length;
    if (registeredCount >= session.capacity) {
      return res.status(400).json({ error: 'Session is full' });
    }

    // Register user (registered but not attended yet)
    data.attendance[sessionId][memberId] = false;

    await writeData(data);

    res.json({
      message: 'Successfully registered for session',
      session: session,
      member: { name: req.user.name, email: req.user.email }
    });
  } catch (error) {
    console.error('Error registering for session:', error);
    res.status(500).json({ error: 'Failed to register for session' });
  }
});

app.delete('/api/sessions/:sessionId/register', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'You must be logged in to unregister from sessions' });
  }

  try {
    const { sessionId } = req.params;
    const memberId = req.user.id;
    const data = await readData();

    if (!data.attendance[sessionId] || data.attendance[sessionId][memberId] === undefined) {
      return res.status(400).json({ error: 'Not registered for this session' });
    }

    delete data.attendance[sessionId][memberId];

    // Clean up empty session attendance
    if (Object.keys(data.attendance[sessionId]).length === 0) {
      delete data.attendance[sessionId];
    }

    await writeData(data);

    res.json({ message: 'Successfully unregistered from session' });
  } catch (error) {
    console.error('Error unregistering from session:', error);
    res.status(500).json({ error: 'Failed to unregister from session' });
  }
});

app.post('/api/sessions/:sessionId/attend', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'You must be logged in to mark attendance' });
  }

  try {
    const { sessionId } = req.params;
    const memberId = req.user.id;
    const data = await readData();

    // Check if session exists
    const session = data.sessions.find(s => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Initialize attendance if not exists
    if (!data.attendance[sessionId]) {
      data.attendance[sessionId] = {};
    }

    // Mark as attended (true)
    data.attendance[sessionId][memberId] = true;

    await writeData(data);

    res.json({
      message: 'Attendance marked successfully',
      session: session,
      member: { name: req.user.name, email: req.user.email }
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    validateMember(req.body);
    const data = await readData();
    const member = {
      ...req.body,
      id: await generateId(data)
    };
    data.members.push(member);
    await writeData(data);
    res.json(member);
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    validateMember(req.body);
    const data = await readData();
    const memberIndex = data.members.findIndex(m => m.id === req.params.id);
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found' });
    }
    data.members[memberIndex] = { ...req.body, id: req.params.id };
    await writeData(data);
    res.json(data.members[memberIndex]);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const data = await readData();
    data.members = data.members.filter(m => m.id !== req.params.id);
    // Remove member from all attendance records
    Object.keys(data.attendance).forEach(sessionId => {
      delete data.attendance[sessionId][req.params.id];
    });
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// Attendance
app.get('/api/attendance', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.attendance);
  } catch (error) {
    console.error('Error reading attendance:', error);
    res.status(500).json({ error: 'Failed to read attendance' });
  }
});

app.put('/api/attendance/:sessionId/:memberId', async (req, res) => {
  try {
    const data = await readData();
    const { sessionId, memberId } = req.params;
    
    if (!data.attendance[sessionId]) {
      data.attendance[sessionId] = {};
    }
    
    data.attendance[sessionId][memberId] = req.body;
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

app.delete('/api/attendance/:sessionId/:memberId', async (req, res) => {
  try {
    const data = await readData();
    const { sessionId, memberId } = req.params;
    
    if (data.attendance[sessionId]) {
      delete data.attendance[sessionId][memberId];
    }
    
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
});

// Toggle attendance for the current user
app.post('/api/attendance', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const data = await readData();
    const { sessionId, action } = req.body;
    
    // Find the member by email
    const member = data.members.find(m => m.email === req.user.email);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Initialize attendance and registrations for this session if they don't exist
    if (!data.attendance[sessionId]) {
      data.attendance[sessionId] = {};
    }
    if (!data.registrations[sessionId]) {
      data.registrations[sessionId] = [];
    }

    if (action === 'add') {
      data.attendance[sessionId][member.id] = true;
      // Also add to registrations if not already there
      if (!data.registrations[sessionId].includes(member.id)) {
        data.registrations[sessionId].push(member.id);
      }
    } else if (action === 'remove') {
      data.attendance[sessionId][member.id] = false; // Set to false instead of deleting
      // Keep the user in registrations - they were still originally registered
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "add" or "remove"' });
    }

    await writeData(data);
    res.json({ success: true, action, sessionId, memberId: member.id });
  } catch (error) {
    console.error('Error toggling attendance:', error);
    res.status(500).json({ error: 'Failed to toggle attendance' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  await ensureDataDirectory();
  console.log(`Bulldok Climbing Club server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the application`);
  console.log(`Also available at http://127.0.0.1:${PORT}`);
});

module.exports = app;
