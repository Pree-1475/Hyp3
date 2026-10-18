import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { Storage } from '@google-cloud/storage';
import multer from 'multer';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const UPI_VPA = process.env.UPI_VPA || '8341591987@superyes';
const UPI_PAYEE_NAME = process.env.UPI_PAYEE_NAME || 'HYP3 by Teepresso';
const GCS_BUCKET_NAME = process.env.GCS_BUCKET || 'teepresso-hyp3-media';

// Neon Postgres connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_e1uQ0RlqHxKS@ep-weathered-flower-aziqw39r-pooler.c-3.ap-southeast-1.aws.neon.tech/hyp3?sslmode=require';
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Google Cloud Storage client
const storage = new Storage();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

app.use(cors());
app.use(express.json());

// Serve static frontend assets from parent root directory
app.use(express.static(path.join(__dirname, '..')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Explicit page routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

// Helper to generate UPI URI
function generateUpiUri({ vpa, payeeName, amount, orderId, note }) {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note || `Order ${orderId} - HYP3`,
    tr: orderId
  });
  return `upi://pay?${params.toString()}`;
}

// Health check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'connected';
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    dbStatus = `disconnected (${err.message})`;
  }

  res.json({
    status: 'ok',
    app: 'HYP3 Cloud Run API',
    database: dbStatus,
    vpa: UPI_VPA,
    bucket: GCS_BUCKET_NAME,
    timestamp: new Date().toISOString()
  });
});

// 1. PRODUCTS API
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM public.products ORDER BY num ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { id, num, name, subtitle = '', price = 1199, stock = 20, sizes = ['S', 'M', 'L', 'XL', 'XXL'], image, description = '' } = req.body;
  if (!id || !name || !image) {
    return res.status(400).json({ success: false, error: 'id, name, and image are required' });
  }

  try {
    const query = `
      INSERT INTO public.products (id, num, name, subtitle, price, stock, sizes, image, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        num = EXCLUDED.num,
        name = EXCLUDED.name,
        subtitle = EXCLUDED.subtitle,
        price = EXCLUDED.price,
        stock = EXCLUDED.stock,
        sizes = EXCLUDED.sizes,
        image = EXCLUDED.image,
        description = EXCLUDED.description
      RETURNING *;
    `;
    const values = [id, num || '01', name, subtitle, price, stock, JSON.stringify(sizes), image, description];
    const { rows } = await pool.query(query, values);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error saving product:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM public.products WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CHECKOUT INTENT & UPI QR
app.post('/api/checkout/create-intent', async (req, res) => {
  const { productId, size = 'M', color = 'black', quantity = 1, customer = {} } = req.body;
  
  try {
    const { rows } = await pool.query('SELECT * FROM public.products WHERE id = $1', [productId]);
    const product = rows[0];

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const totalAmount = Number(product.price) * qty;
    const orderId = `HYP3-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const note = `HYP3 ${product.name} (${size}) [${orderId}]`;
    const upiUri = generateUpiUri({
      vpa: UPI_VPA,
      payeeName: UPI_PAYEE_NAME,
      amount: totalAmount,
      orderId,
      note
    });

    res.json({
      success: true,
      data: {
        orderId,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image
        },
        size,
        color,
        quantity: qty,
        totalAmount,
        currency: 'INR',
        vpa: UPI_VPA,
        payeeName: UPI_PAYEE_NAME,
        upiUri,
        status: 'PENDING_PAYMENT'
      }
    });
  } catch (err) {
    console.error('Error creating checkout intent:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. ORDERS API
app.get('/api/orders', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM public.orders ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const {
    id,
    customer_name = 'Anonymous Customer',
    customer_phone = '',
    customer_email = '',
    shipping_address = '',
    item,
    size = 'M',
    amount,
    utr = '',
    status = 'confirmed'
  } = req.body;

  if (!id || !item || !amount) {
    return res.status(400).json({ success: false, error: 'id, item, and amount are required' });
  }

  try {
    const query = `
      INSERT INTO public.orders (id, customer_name, customer_phone, customer_email, shipping_address, item, size, amount, utr, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        customer_phone = EXCLUDED.customer_phone,
        customer_email = EXCLUDED.customer_email,
        shipping_address = EXCLUDED.shipping_address,
        utr = EXCLUDED.utr,
        status = EXCLUDED.status
      RETURNING *;
    `;
    const values = [id, customer_name, customer_phone, customer_email, shipping_address, item, size, amount, utr, status];
    const { rows } = await pool.query(query, values);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, error: 'status is required' });
  }

  try {
    const { rows } = await pool.query('UPDATE public.orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GOOGLE CLOUD STORAGE FILE UPLOAD
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file provided' });
  }

  try {
    const bucket = storage.bucket(GCS_BUCKET_NAME);
    const ext = path.extname(req.file.originalname) || '.png';
    const cleanName = path.basename(req.file.originalname, ext).toLowerCase().replace(/[^a-z0-9]/g, '-');
    const destination = `uploads/${Date.now()}-${cleanName}${ext}`;

    const file = bucket.file(destination);
    await file.save(req.file.buffer, {
      contentType: req.file.mimetype,
      resumable: false
    });

    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${destination}`;
    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('GCS Upload Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 HYP3 Server running on port ${PORT}`);
  console.log(`💳 UPI Target VPA: ${UPI_VPA}`);
  console.log(`☁️ Connected to GCS Bucket: ${GCS_BUCKET_NAME}`);
});

export default app;
