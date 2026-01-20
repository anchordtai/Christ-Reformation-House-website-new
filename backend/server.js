const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Replace with your actual Flutterwave secret key
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || 'YOUR_FLUTTERWAVE_SECRET_KEY';

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
      return res.json({ token, user: { email, name: 'User' } });
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

// ==================== DONATIONS ====================
app.post('/api/donations', async (req, res) => {
  try {
    const donation = {
      id: Date.now(),
      ...req.body,
      status: 'pending',
      date: new Date().toISOString()
    };
    
    const donations = readJSONFile('donations.json');
    donations.push(donation);
    writeJSONFile('donations.json', donations);
    
    res.json({ success: true, donation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/donations/verify', async (req, res) => {
  const { transaction_id, tx_ref, amount, currency, email, name, country, state, address, donationType } = req.body;
  if (!transaction_id) {
    return res.status(400).json({ verified: false, error: 'Missing transaction_id' });
  }
  try {
    // Verify payment with Flutterwave
    const flwRes = await axios.get(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`
      }
    });
    const data = flwRes.data;
    if (
      data.status === 'success' &&
      data.data &&
      data.data.status === 'successful' &&
      data.data.amount == amount &&
      data.data.currency === currency &&
      data.data.tx_ref === tx_ref
    ) {
      // Store donation record
      const donation = {
        transaction_id,
        tx_ref,
        amount,
        currency,
        email,
        name,
        country,
        state,
        address,
        donationType,
        verified: true,
        date: new Date().toISOString()
      };
      const donations = readJSONFile('donations.json');
      donations.push(donation);
      writeJSONFile('donations.json', donations);
      return res.json({ verified: true });
    } else {
      return res.status(400).json({ verified: false, error: 'Payment not verified' });
    }
  } catch (err) {
    return res.status(500).json({ verified: false, error: 'Verification failed', details: err.message });
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
