const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const dataDir = path.join(__dirname, 'mockdata');
const sessionsPath = path.join(dataDir, 'sessions.json');

function ensureDataFiles() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Created mockdata directory:', dataDir);
    }

    if (!fs.existsSync(sessionsPath)) {
      fs.writeFileSync(sessionsPath, JSON.stringify([], null, 2), 'utf8');
      console.log('Created sessions.json with empty array');
    }
  } catch (err) {
    console.error('Failed to ensure data files:', err);
    process.exit(1);
  }
}

ensureDataFiles();

// Helpers
function readSessions() {
  try {
    const content = fs.readFileSync(sessionsPath, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading sessions.json:', err);
    return [];
  }
}

function writeSessions(sessions) {
  try {
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing sessions.json:', err);
    throw err;
  }
}

function ensureHistoryFile(sessionId, initialContent = []) {
  const historyFile = path.join(dataDir, `history-${sessionId}.json`);
  if (!fs.existsSync(historyFile)) {
    fs.writeFileSync(historyFile, JSON.stringify(initialContent, null, 2), 'utf8');
  }
  return historyFile;
}

function readHistory(sessionId) {
  const historyFile = path.join(dataDir, `history-${sessionId}.json`);
  if (!fs.existsSync(historyFile)) return null;
  try {
    const text = fs.readFileSync(historyFile, 'utf8') || '[]';
    return JSON.parse(text);
  } catch (err) {
    console.error('Error reading history file for', sessionId, err);
    return null;
  }
}

function writeHistory(sessionId, history) {
  const historyFile = path.join(dataDir, `history-${sessionId}.json`);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');
}

// Routes

app.get('/api/sessions', (req, res) => {
  try {
    const sessions = readSessions();
    res.json(Array.isArray(sessions) ? sessions : []);
  } catch (err) {
    console.error('/api/sessions error:', err);
    res.status(500).json({ error: 'Failed to read sessions' });
  }
});

app.get('/api/new-chat', (req, res) => {
  try {
    const sessions = readSessions();
    const newSessionId = `session-${Date.now()}`;
    const newSession = { id: newSessionId, title: `Chat ${sessions.length + 1}`, preview: 'Welcome message' };

    sessions.push(newSession);
    writeSessions(sessions);

    const initialHistory = [
      {
        role: 'system',
        question: null,
        response: 'Welcome! Ask a question to start the chat.',
        table: [],
        timestamp: Date.now(),
      },
    ];

    ensureHistoryFile(newSessionId, initialHistory);

    res.json({ ...newSession, history: initialHistory });
  } catch (err) {
    console.error('/api/new-chat error:', err);
    res.status(500).json({ error: 'Failed to create new chat' });
  }
});

app.get('/api/session/:id', (req, res) => {
  const id = req.params.id;
  try {
    const historyFile = path.join(dataDir, `history-${id}.json`);

    if (!fs.existsSync(historyFile)) {
      const sessions = readSessions();
      if (!sessions.find((s) => s.id === id)) {
        sessions.push({ id, title: `Chat ${sessions.length + 1}` });
        writeSessions(sessions);
      }
      fs.writeFileSync(historyFile, JSON.stringify([], null, 2), 'utf8');
      return res.json([]);
    }

    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8') || '[]');
    return res.json(history);
  } catch (err) {
    console.error(`/api/session/${id} error:`, err);
    res.status(500).json({ error: 'Failed to read session history' });
  }
});

app.post('/api/chat/:id', (req, res) => {
  const sessionId = req.params.id;
  const { question } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid `question` in request body' });
  }

  try {
    const answer = {
      question,
      response: 'This is a mock response',
      table: [
        { key: 'Column A', value: 'Value 1' },
        { key: 'Column B', value: 'Value 2' },
      ],
      timestamp: Date.now(),
    };

    const historyFile = ensureHistoryFile(sessionId);
    const historyRaw = fs.readFileSync(historyFile, 'utf8') || '[]';
    const history = JSON.parse(historyRaw);
    history.push(answer);
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');

    return res.json(answer);
  } catch (err) {
    console.error(`/api/chat/${sessionId} error:`, err);
    return res.status(500).json({ error: 'Failed to append chat history' });
  }
});

app.post('/api/session/:id/feedback', (req, res) => {
  const sessionId = req.params.id;
  const { timestamp, feedback } = req.body;

  console.log('Feedback request:', { sessionId, timestamp, feedback });

  if (!timestamp || (feedback !== 'like' && feedback !== 'dislike')) {
    return res.status(400).json({ error: 'Missing or invalid timestamp/feedback' });
  }

  try {
    const historyFile = path.join(dataDir, `history-${sessionId}.json`);
    if (!fs.existsSync(historyFile)) {
      console.warn('History file not found for session:', sessionId);
      return res.status(404).json({ error: 'Session not found' });
    }

    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8') || '[]');

    const targetTs = typeof timestamp === 'number' ? timestamp : Number(timestamp);
    const idx = history.findIndex((item) => Number(item.timestamp) === targetTs);

    if (idx === -1) {
      console.warn('Message with timestamp not found:', timestamp);
      return res.status(404).json({ error: 'Message not found' });
    }

    history[idx].feedback = feedback;
    history[idx].feedbackAt = Date.now();

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');

    return res.json(history[idx]);
  } catch (err) {
    console.error('Error saving feedback:', err);
    return res.status(500).json({ error: 'Failed to save feedback' });
  }
});


app.get('/', (req, res) => {
  res.send('Mock API server is running.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Mock API server running on port ${PORT}`);
});
