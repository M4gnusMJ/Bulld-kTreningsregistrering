const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'climbclub.json');

async function ensureDataDirectory() {
  try {
    await fs.access(path.join(__dirname, 'data'));
  } catch {
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
  }
}

async function generateId(data) {
  const id = data._seq;
  data._seq += 1;
  return String(id);
}

async function initializeData() {
  try {
    // Check if data file already exists
    await fs.access(DATA_FILE);
    console.log('Data file already exists, skipping initialization');
    return;
  } catch {
    // File doesn't exist, create it with sample data
    console.log('Initializing data with sample data...');
  }

  await ensureDataDirectory();

  const data = {
    members: [],
    sessions: [],
    attendance: {},
    _seq: 1
  };

  // Generate sample sessions
  const sampleSessions = [];
  
  // August 2025 - Past sessions for testing attendance
  const augustSessions = [
    { date: '2025-08-01', day: 'Friday', discipline: 'Bouldering' },
    { date: '2025-08-06', day: 'Tuesday', discipline: 'Top-rope' },
    { date: '2025-08-08', day: 'Thursday', discipline: 'Lead' },
    { date: '2025-08-13', day: 'Tuesday', discipline: 'Bouldering' }
  ];

  for (const session of augustSessions) {
    sampleSessions.push({
      id: await generateId(data),
      date: session.date,
      location: 'Grip Sluppen',
      start: '19:00',
      end: '23:00',
      discipline: session.discipline,
      capacity: 12,
      notes: session.discipline === 'Lead'
        ? 'Ledklatring - brattkort påkrevd!'
        : session.discipline === 'Top-rope'
        ? 'Topptau for alle nivåer. Nybegynnere velkomne!'
        : 'Buldring for alle nivåer. Sosialt og gøy!'
    });
  }
  
  // September 2025 - Future sessions
  const septemberSessions = [
    // Week 1
    { date: '2025-09-02', day: 'Tuesday', discipline: 'Bouldering' },
    { date: '2025-09-04', day: 'Thursday', discipline: 'Top-rope' },
    // Week 2
    { date: '2025-09-09', day: 'Tuesday', discipline: 'Lead' },
    { date: '2025-09-11', day: 'Thursday', discipline: 'Bouldering' },
    // Week 3
    { date: '2025-09-16', day: 'Tuesday', discipline: 'Strength/Conditioning' },
    { date: '2025-09-18', day: 'Thursday', discipline: 'Top-rope' },
    // Week 4
    { date: '2025-09-23', day: 'Tuesday', discipline: 'Bouldering' },
    { date: '2025-09-25', day: 'Thursday', discipline: 'Lead' },
    // Week 5
    { date: '2025-09-30', day: 'Tuesday', discipline: 'Bouldering' }
  ];
  
  for (const session of septemberSessions) {
    sampleSessions.push({
      id: await generateId(data),
      date: session.date,
      location: 'Grip Sluppen',
      start: '19:00',
      end: '23:00',
      discipline: session.discipline,
      capacity: session.discipline === 'Strength/Conditioning' ? 8 : 12,
      notes: session.discipline === 'Strength/Conditioning' 
        ? 'Styrketrening og kondisjon. Ta med treningsklær.'
        : session.discipline === 'Lead'
        ? 'Ledklatring - brattkort påkrevd!'
        : session.discipline === 'Top-rope'
        ? 'Topptau for alle nivåer. Nybegynnere velkomne!'
        : 'Buldring for alle nivåer. Sosialt og gøy!'
    });
  }
  
  data.sessions = sampleSessions;

  // Generate sample members
  const sampleMembers = [
    {
      id: await generateId(data),
      name: 'Magnus Moldekleiv',
      email: 'magnus@example.com',
      belay: true,
      emergency: '12345678',
      pr: 'V6 / Orange',
      notes: 'Instruktør'
    },
    {
      id: await generateId(data),
      name: 'Anna Hansen',
      email: 'anna@example.com',
      belay: true,
      emergency: '87654321',
      pr: 'V4 / Grønn',
      notes: ''
    },
    {
      id: await generateId(data),
      name: 'Erik Normann',
      email: 'erik@example.com',
      belay: false,
      emergency: '11223344',
      pr: 'V2 / Gul',
      notes: 'Nybegynner'
    }
  ];
  
  data.members = sampleMembers;

  // Write the initial data
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Sample data initialized with ${data.sessions.length} sessions and ${data.members.length} members`);
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeData().catch(console.error);
}

module.exports = { initializeData };
