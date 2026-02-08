const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Flutterwave: keys MUST be in environment variables only (backend/.env). Never commit or expose.
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FRONTEND_ORIGIN_DONATE = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(cors());
app.use(express.json());

// Helper function to read JSON file
const readJSONFile = (filename) => {
  const filePath = path.join(__dirname, filename);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return [];
};

// Helper function to write JSON file
const writeJSONFile = (filename, data) => {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// ==================== AUTHENTICATION ====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // In production, verify against database
    // For now, simple validation
    if (email && password) {
      const token = 'mock-jwt-token-' + Date.now();
      const isAdmin = email === 'admin@church.org' || email.endsWith('@admin');
      return res.json({ token, user: { email, name: 'User', role: isAdmin ? 'admin' : 'member', isAdmin } });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    // In production, save to database
    const token = 'mock-jwt-token-' + Date.now();
    return res.json({ token, user: { name, email, phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  // In production, verify token and return user
  res.json({ user: { name: 'User', email: 'user@example.com' } });
});

// ==================== SERMONS ====================
app.get('/api/sermons', (req, res) => {
  try {
    const sermons = readJSONFile('sermons.json');
    res.json(sermons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sermons/:id', (req, res) => {
  try {
    const sermons = readJSONFile('sermons.json');
    const sermon = sermons.find(s => s.id === parseInt(req.params.id));
    if (!sermon) {
      return res.status(404).json({ error: 'Sermon not found' });
    }
    res.json(sermon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sermons/search', (req, res) => {
  try {
    const { q } = req.query;
    const sermons = readJSONFile('sermons.json');
    const filtered = sermons.filter(s => 
      s.title.toLowerCase().includes(q.toLowerCase()) ||
      s.speaker.toLowerCase().includes(q.toLowerCase())
    );
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== EVENTS ====================
app.get('/api/events', (req, res) => {
  try {
    const events = readJSONFile('events.json');
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events/:id', (req, res) => {
  try {
    const events = readJSONFile('events.json');
    const event = events.find(e => e.id === parseInt(req.params.id));
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/:id/register', (req, res) => {
  try {
    const registrations = readJSONFile('event-registrations.json');
    const registration = {
      id: registrations.length + 1,
      eventId: parseInt(req.params.id),
      ...req.body,
      date: new Date().toISOString()
    };
    registrations.push(registration);
    writeJSONFile('event-registrations.json', registrations);
    res.json({ success: true, registration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events/search', (req, res) => {
  try {
    const { q } = req.query;
    const events = readJSONFile('events.json');
    const filtered = events.filter(e => 
      e.title.toLowerCase().includes(q.toLowerCase())
    );
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== BLOG ====================
app.get('/api/blog', (req, res) => {
  try {
    const posts = readJSONFile('blog.json');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blog/:id', (req, res) => {
  try {
    const posts = readJSONFile('blog.json');
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blog/search', (req, res) => {
  try {
    const { q } = req.query;
    const posts = readJSONFile('blog.json');
    const filtered = posts.filter(p => 
      p.title.toLowerCase().includes(q.toLowerCase())
    );
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DEVOTIONALS ====================
app.get('/api/devotionals', (req, res) => {
  try {
    const devotionals = readJSONFile('devotionals.json');
    res.json(devotionals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/devotionals', (req, res) => {
  try {
    const { date } = req.query;
    const devotionals = readJSONFile('devotionals.json');
    if (date) {
      const devotional = devotionals.find(d => d.date === date);
      return res.json(devotional || devotionals[0]);
    }
    res.json(devotionals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DONATIONS (Flutterwave – keys server-side only) ====================
const DONATION_ALLOWED_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'ZAR', 'KES'];

function generateTxRef() {
  return 'crh-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
}

app.post('/api/donations', async (req, res) => {
  if (!FLW_SECRET_KEY) {
    return res.status(503).json({ error: 'Payment service not configured. Set FLW_SECRET_KEY in backend .env.' });
  }
  try {
    const { amount, currency, donationType, name, email, phone, message } = req.body || {};
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const currencyCode = (currency && typeof currency === 'string') ? currency.toUpperCase().trim() : 'NGN';
    if (!DONATION_ALLOWED_CURRENCIES.includes(currencyCode)) {
      return res.status(400).json({ error: `Currency not supported. Use one of: ${DONATION_ALLOWED_CURRENCIES.join(', ')}` });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const txRef = generateTxRef();
    const amountRounded = currencyCode === 'NGN' ? Math.round(numAmount) : Math.round(numAmount * 100) / 100;
    const donation = {
      id: Date.now(),
      tx_ref: txRef,
      amount: amountRounded,
      currency: currencyCode,
      donationType: donationType || 'general',
      name: (name || '').trim().slice(0, 255),
      email: email.trim().toLowerCase().slice(0, 255),
      phone: (phone || '').trim().slice(0, 50),
      message: (message || '').trim().slice(0, 2000),
      status: 'pending',
      date: new Date().toISOString(),
    };

    const donations = readJSONFile('donations.json');
    donations.push(donation);
    writeJSONFile('donations.json', donations);

    const redirectUrl = `${FRONTEND_ORIGIN_DONATE}/donate/return?tx_ref=${encodeURIComponent(txRef)}`;
    const flwPayload = {
      tx_ref: txRef,
      amount: amountRounded,
      currency: currencyCode,
      redirect_url: redirectUrl,
      customer: {
        email: donation.email,
        name: donation.name || 'Donor',
        phonenumber: donation.phone || undefined,
      },
      customizations: {
        title: "Christ's Reformation House - Donation",
        description: donation.donationType || 'Donation',
      },
      meta: { donation_type: donation.donationType },
    };

    const flwRes = await axios.post('https://api.flutterwave.com/v3/payments', flwPayload, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const flwData = flwRes.data;
    if (flwData.status !== 'success' || !flwData.data?.link) {
      return res.status(502).json({
        error: flwData.message || 'Could not create payment link',
      });
    }

    res.json({ success: true, redirectUrl: flwData.data.link });
  } catch (err) {
    if (err.response?.data) {
      // Don't forward 401 from Flutterwave (bad API key) as 401 – client would redirect to login
      const status = err.response.status === 401 ? 503 : (err.response.status || 502);
      return res.status(status).json({
        error: err.response.status === 401
          ? 'Payment service configuration error. Please try again later.'
          : (err.response.data.message || 'Payment initiation failed'),
      });
    }
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

app.post('/api/donations/verify', async (req, res) => {
  const { transaction_id, tx_ref } = req.body || {};
  if (!transaction_id) {
    return res.status(400).json({ verified: false, error: 'Missing transaction_id' });
  }
  if (!FLW_SECRET_KEY) {
    return res.status(503).json({ verified: false, error: 'Payment service not configured' });
  }
  try {
    const flwRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transaction_id)}/verify`,
      {
        headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
        timeout: 10000,
      }
    );
    const data = flwRes.data;
    if (data.status !== 'success' || !data.data) {
      return res.status(400).json({ verified: false, error: 'Transaction not found' });
    }

    const tx = data.data;
    if (tx.status !== 'successful') {
      return res.json({ verified: false, error: 'Payment was not successful' });
    }

    const donations = readJSONFile('donations.json');
    const idx = donations.findIndex((d) => d.tx_ref === (tx_ref || tx.tx_ref));
    if (idx !== -1) {
      donations[idx].status = 'verified';
      donations[idx].transaction_id = tx.id;
      donations[idx].verified_at = new Date().toISOString();
      writeJSONFile('donations.json', donations);
    }

    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({
      verified: false,
      error: err.response?.data?.message || 'Verification failed',
    });
  }
});

// ==================== PRAYER REQUESTS ====================
app.post('/api/prayer-requests', (req, res) => {
  try {
    const requests = readJSONFile('prayer-requests.json');
    const request = {
      id: requests.length + 1,
      ...req.body,
      date: new Date().toISOString()
    };
    requests.push(request);
    writeJSONFile('prayer-requests.json', requests);
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/prayer-requests', (req, res) => {
  try {
    const requests = readJSONFile('prayer-requests.json');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CONTACT ====================
app.post('/api/contact', (req, res) => {
  try {
    const messages = readJSONFile('contact-messages.json');
    const message = {
      id: messages.length + 1,
      ...req.body,
      date: new Date().toISOString()
    };
    messages.push(message);
    writeJSONFile('contact-messages.json', messages);
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STORE ====================
app.get('/api/store/products', (req, res) => {
  try {
    const products = readJSONFile('store-products.json');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/store/products/:id', (req, res) => {
  try {
    const products = readJSONFile('store-products.json');
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/store/orders', (req, res) => {
  try {
    const orders = readJSONFile('store-orders.json');
    const order = {
      id: orders.length + 1,
      ...req.body,
      status: 'pending',
      date: new Date().toISOString()
    };
    orders.push(order);
    writeJSONFile('store-orders.json', orders);
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== MEETINGS (Teams-style: Jitsi, tokens, invites) ====================
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || 'meet.jit.si';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

function generateJoinToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getMeetings() {
  try {
    const data = readJSONFile('meetings.json');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveMeetings(meetings) {
  writeJSONFile('meetings.json', meetings);
}

app.get('/api/meetings', (req, res) => {
  try {
    const meetings = getMeetings();
    const { status } = req.query;
    let list = meetings;
    if (status) list = meetings.filter((m) => m.status === status);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/meetings/:id', (req, res) => {
  try {
    const meetings = getMeetings();
    const meeting = meetings.find((m) => m.id === parseInt(req.params.id));
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings', (req, res) => {
  try {
    const meetings = getMeetings();
    const { title, description, startTime, endTime, inviteEmails = [] } = req.body;
    const id = meetings.length ? Math.max(...meetings.map((m) => m.id)) + 1 : 1;
    const joinToken = generateJoinToken();
    const roomName = `CRH-Meeting-${id}-${joinToken.slice(0, 8)}`.replace(/[^a-zA-Z0-9-]/g, '');
    const meeting = {
      id,
      title: title || 'Meeting',
      description: description || '',
      startTime: startTime || null,
      endTime: endTime || null,
      status: 'scheduled',
      joinToken,
      roomName,
      inviteEmails,
      createdAt: new Date().toISOString(),
    };
    meetings.push(meeting);
    saveMeetings(meetings);
    res.json({ id, ...meeting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/meetings/:id', (req, res) => {
  try {
    const meetings = getMeetings();
    const idx = meetings.findIndex((m) => m.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Meeting not found' });
    const { title, description, startTime, endTime } = req.body;
    if (title !== undefined) meetings[idx].title = title;
    if (description !== undefined) meetings[idx].description = description;
    if (startTime !== undefined) meetings[idx].startTime = startTime;
    if (endTime !== undefined) meetings[idx].endTime = endTime;
    saveMeetings(meetings);
    res.json(meetings[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings/:id/cancel', (req, res) => {
  try {
    const meetings = getMeetings();
    const idx = meetings.findIndex((m) => m.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Meeting not found' });
    meetings[idx].status = 'cancelled';
    meetings[idx].cancelledAt = new Date().toISOString();
    meetings[idx].cancelReason = req.body.reason || '';
    saveMeetings(meetings);
    res.json(meetings[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meetings/:id/invites', (req, res) => {
  try {
    const meetings = getMeetings();
    const meeting = meetings.find((m) => m.id === parseInt(req.params.id));
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    const emails = req.body.emails || [];
    // In production: send via SendGrid/Nodemailer with meeting link
    const joinLink = `${FRONTEND_ORIGIN}/meetings/room/${meeting.id}?token=${meeting.joinToken}`;
    if (process.env.SENDGRID_API_KEY) {
      // Optional: await sendInviteEmails(emails, meeting, joinLink);
    }
    res.json({ success: true, sent: emails.length, message: 'Invites processed. Configure SendGrid for actual email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/meetings/:id/join', (req, res) => {
  try {
    const meetings = getMeetings();
    const meeting = meetings.find((m) => m.id === parseInt(req.params.id));
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    const token = req.query.token;
    if (meeting.joinToken && token !== meeting.joinToken) {
      return res.status(403).json({ error: 'Invalid or expired join link' });
    }
    const jitsiUrl = `https://${JITSI_DOMAIN}/${meeting.roomName}`;
    res.json({
      url: jitsiUrl,
      roomName: meeting.roomName,
      subject: meeting.title,
      useEmbed: true,
      joinToken: meeting.joinToken,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
