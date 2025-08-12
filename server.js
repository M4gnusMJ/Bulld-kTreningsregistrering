const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'climbclub.json');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

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
    res.json(data.sessions);
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  await ensureDataDirectory();
  console.log(`Bulldok Climbing Club server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the application`);
});

module.exports = app;
