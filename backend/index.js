const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5008;

const allowedOrigins = [
  process.env.ALLOWED_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5008'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      // In production, you might want to be stricter, but for now we allow if ALLOWED_ORIGIN is not set
      if (process.env.NODE_ENV !== 'production' || !process.env.ALLOWED_ORIGIN) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
const staticPath = path.join(__dirname, '../frontend/dist');
console.log('Serving static files from:', staticPath);
app.use(express.static(staticPath));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Disbursement Backend is running!' });
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { staffId, password } = req.body;
    
    if (!staffId || !password) {
      return res.status(400).json({ message: 'Staff ID and Password are required.' });
    }

    console.log(`🔑 Login attempt for: ${staffId}`);

    // Query the 'staff' table for the user with strict role requirement
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .ilike('staff_id', staffId)
      .eq('password', password)
      .single();

    if (error || !staff) {
      console.warn(`❌ Login failed: Invalid credentials for Staff ID ${staffId}.`);
      return res.status(401).json({ message: 'Invalid Staff ID or password.' });
    }

    // DEBUG: Log the actual role from DB
    console.log(`🔍 User ${staffId} found in database. Actual Role: "${staff.role}"`);

    // FINAL STRICT ROLE VERIFICATION
    // Must be exactly "Disbursement Officer" (case-insensitive)
    const dbRole = staff.role?.trim() || "";
    const isDO = dbRole.toLowerCase() === 'disbursement officer';
    
    if (!isDO) {
      console.warn(`🚫 ACCESS DENIED: User ${staffId} is a "${dbRole}", not a "Disbursement Officer".`);
      return res.status(403).json({ 
        message: 'Access Denied! This portal is strictly for Disbursement Officers. Managers and other roles are NOT allowed here.',
        roleRejected: dbRole
      });
    }

    console.log(`✅ Login authorized for Disbursement Officer: ${staffId} (${staff.name})`);

    // Success logic
    return res.status(200).json({
      message: 'Login successful',
      role: staff.role,
      staffId: staff.staff_id,
      name: staff.name
    });
  } catch (err) {
    console.error('💥 Login Error:', err.message);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// --- DISBURSEMENT WORKFLOW ENDPOINTS ---

// 1. Fetch loans that are SANCTIONED but NOT YET CREDITED (Queue)
app.get('/api/queue', async (req, res) => {
  try {
    const { search } = req.query;
    console.log(`🔍 Fetching Queue... Search: "${search || ''}"`);

    let query = supabase
      .from('loans')
      .select('*, members(member_no)')
      .eq('status', 'SANCTIONED');

    // Combine filters to ensure valid PostgREST query
    if (search) {
      query = query.or(`disbursement_status.eq.PENDING,disbursement_status.is.null`);
      query = query.or(`member_name.ilike.%${search}%,center_name.ilike.%${search}%`);
    } else {
      query = query.or(`disbursement_status.eq.PENDING,disbursement_status.is.null`);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Supabase Queue Error:', error);
      return res.status(500).json({ 
        error: 'Database query failed', 
        details: error.message,
        hint: error.hint 
      });
    }

    res.json(data || []);
  } catch (err) {
    console.error('💥 API 500 Error (Queue):', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// 2. Fetch loans that are already CREDITED (History)
app.get('/api/history', async (req, res) => {
  try {
    const { search } = req.query;
    console.log(`🔍 Fetching History... Search: "${search || ''}"`);

    let query = supabase
      .from('loans')
      .select('*, members(member_no)')
      .eq('disbursement_status', 'CREDITED');

    if (search) {
      query = query.or(`member_name.ilike.%${search}%,center_name.ilike.%${search}%`);
    }

    const { data, error } = await query.order('credited_at', { ascending: false }).limit(50);

    if (error) {
      console.error('❌ Supabase History Error:', error);
      return res.status(500).json({ 
        error: 'Database query failed', 
        details: error.message,
        hint: error.hint 
      });
    }

    res.json(data || []);
  } catch (err) {
    console.error('💥 API 500 Error (History):', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// 2. Mark a loan as CREDITED
app.post('/api/credit', async (req, res) => {
  const { loanId, staffId, amountSanctioned } = req.body;
  try {
    const { data, error } = await supabase
      .from('loans')
      .update({
        disbursement_status: 'CREDITED',
        status: 'CREDITED', // Ensure main status also updates if needed
        credited_at: new Date().toISOString(),
        amount_sanctioned: amountSanctioned
      })
      .eq('id', loanId)
      .select();

    if (error) {
      console.error('❌ Credit Update Error:', error);
      throw error;
    }
    res.json({ message: 'Loan marked as CREDITED successfully', data: data[0] });
  } catch (err) {
    console.error('💥 API 500 Error (Credit):', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ----------------------------------------

// Serve frontend index.html for all other routes
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, '../frontend/dist/index.html');
  console.log(`[GET] ${req.url} -> serving ${filePath}`);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send(err.message);
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Disbursement Backend running on http://localhost:${PORT}`);
});
