/**
 * HYP3 Client Admin Console - Vanilla JS + Supabase Integration
 * Uses first principles of Web Development: Pure JS DOM manipulation & events
 * Works with live Supabase database or seamlessly falls back to local state.
 */

// Initial Catalog (Used as fallback if offline)
let products = [
  {
    id: 'shatter',
    num: '01',
    name: 'SHATTER',
    subtitle: 'Thermal Vinyl Graphic Tee',
    price: 1199,
    stock: 24,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: '../assets/shatter.png',
    description: 'Deconstructed geometric fracture printed in high-density matte thermal polyurethane.'
  },
  {
    id: 'spiral',
    num: '02',
    name: 'SPIRAL',
    subtitle: 'Kinetic Motion Vinyl Tee',
    price: 1199,
    stock: 18,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: '../assets/spiral.png',
    description: 'Concentric motion study printed in deep-matte thermal flex film.'
  },
  {
    id: 'core',
    num: '03',
    name: 'CORE',
    subtitle: 'Industrial Typography Tee',
    price: 1199,
    stock: 31,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: '../assets/core.png',
    description: 'Minimalist industrial spec print with acid accent block.'
  },
  {
    id: 'flow',
    num: '04',
    name: 'FLOW',
    subtitle: 'Fluid Distortion Vinyl Tee',
    price: 1199,
    stock: 12,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    image: '../assets/flow.png',
    description: 'Topographic contour distortion in high-density micro-groove vinyl.'
  }
];

// Initial Orders (Used as fallback if offline)
let orders = [];

// State
let activeTab = 'orders';
let editingProductId = null;
let selectedImageFile = null;
let uploadedImageUrl = '../assets/shatter.png';

// DOM Elements
const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserEmail = document.getElementById('currentUserEmail');

const tabOrders = document.getElementById('tab-orders');
const tabProducts = document.getElementById('tab-products');
const navButtons = document.querySelectorAll('.nav-btn');

const ordersTableBody = document.getElementById('ordersTableBody');
const orderSearch = document.getElementById('orderSearch');
const statusFilter = document.getElementById('statusFilter');
const exportExcelBtn = document.getElementById('exportExcelBtn');

const statRevenue = document.getElementById('statRevenue');
const statTotalOrders = document.getElementById('statTotalOrders');
const statPendingOrders = document.getElementById('statPendingOrders');

const productsGrid = document.getElementById('productsGrid');
const productModal = document.getElementById('productModal');
const openAddProductModal = document.getElementById('openAddProductModal');
const closeProductModal = document.getElementById('closeProductModal');
const cancelProductBtn = document.getElementById('cancelProductBtn');
const productForm = document.getElementById('productForm');

// 1. Auth Flow
const VALID_ADMIN_USER = 'saiteja';
const VALID_ADMIN_PASS = 'hyp3@tee';

// Check existing session
if (sessionStorage.getItem('hyp3_auth') === 'true') {
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  currentUserEmail.textContent = sessionStorage.getItem('hyp3_user') || VALID_ADMIN_USER;
  initSupabaseAndData();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const loginError = document.getElementById('loginError');

  if ((username.toLowerCase() === VALID_ADMIN_USER || username.toLowerCase() === 'admin') && password === VALID_ADMIN_PASS) {
    if (loginError) loginError.style.display = 'none';
    currentUserEmail.textContent = username;
    sessionStorage.setItem('hyp3_auth', 'true');
    sessionStorage.setItem('hyp3_user', username);
    authView.classList.add('hidden');
    appView.classList.remove('hidden');
    await initSupabaseAndData();
  } else {
    if (loginError) {
      loginError.style.display = 'block';
    } else {
      alert('Invalid username or password');
    }
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('hyp3_auth');
  sessionStorage.removeItem('hyp3_user');
  appView.classList.add('hidden');
  authView.classList.remove('hidden');
});

// Mobile Menu Controls
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

function openMobileSidebar() {
  sidebar.classList.add('open');
  sidebarBackdrop.classList.add('open');
}

function closeMobileSidebar() {
  sidebar.classList.remove('open');
  sidebarBackdrop.classList.remove('open');
}

if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', openMobileSidebar);
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

// 2. Navigation Tabs
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.getAttribute('data-tab');

    if (activeTab === 'orders') {
      tabOrders.classList.remove('hidden');
      tabProducts.classList.add('hidden');
      renderOrders();
    } else {
      tabOrders.classList.add('hidden');
      tabProducts.classList.remove('hidden');
      renderProducts();
    }

    closeMobileSidebar();
  });
});

// 3. Stats Calculation
function updateStats() {
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const totalCount = orders.length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  statRevenue.textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
  statTotalOrders.textContent = totalCount;
  statPendingOrders.textContent = pendingCount;
}

// 4. Render Orders Table
function renderOrders() {
  updateStats();
  const query = (orderSearch.value || '').trim().toLowerCase();
  const filter = statusFilter.value;

  const filteredOrders = orders.filter(order => {
    const matchesFilter = (filter === 'all') || (order.status === filter);
    const matchesSearch = !query || 
      (order.id && order.id.toLowerCase().includes(query)) ||
      (order.customerName && order.customerName.toLowerCase().includes(query)) ||
      (order.utr && order.utr.toLowerCase().includes(query)) ||
      (order.customerPhone && order.customerPhone.includes(query));
    return matchesFilter && matchesSearch;
  });

  if (filteredOrders.length === 0) {
    ordersTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No orders found matching the filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  ordersTableBody.innerHTML = filteredOrders.map(order => {
    const statusClass = `status-${order.status}`;
    return `
      <tr>
        <td><strong style="color:var(--brand-black); font-weight:600;">${order.id}</strong></td>
        <td style="color:var(--text-secondary); font-size: 12px; white-space: nowrap;">${order.date}</td>
        <td>
          <div style="font-weight:600; color:var(--brand-black);">${order.customerName || 'Customer'}</div>
          <div style="font-size:12px; color:var(--text-secondary);">${order.customerPhone || 'N/A'}</div>
        </td>
        <td>
          <div style="font-weight:500;">${order.item}</div>
          <div style="font-size:11.5px; color:var(--text-muted);">Size: ${order.size}</div>
        </td>
        <td style="font-weight:600; font-family:var(--font-mono);">₹${Number(order.amount || 0).toLocaleString('en-IN')}</td>
        <td>
          <span class="code-tag">
            ${order.utr || 'Pending'}
          </span>
        </td>
        <td>
          <span class="status-pill ${statusClass}">${order.status}</span>
        </td>
        <td style="text-align: right;">
          <select class="select-filter btn-sm" onchange="changeOrderStatus('${order.id}', this.value)">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

window.changeOrderStatus = async function(orderId, newStatus) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    renderOrders();

    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error('Failed to update status on server:', err);
    }
  }
};

orderSearch.addEventListener('input', renderOrders);
statusFilter.addEventListener('change', renderOrders);

// 5. Excel Export with SheetJS
exportExcelBtn.addEventListener('click', () => {
  if (orders.length === 0) {
    alert('No orders available to export.');
    return;
  }

  const exportData = orders.map((o, idx) => ({
    'Sr No': idx + 1,
    'Order ID': o.id,
    'Date & Time': o.date,
    'Customer Name': o.customerName,
    'Phone': o.customerPhone,
    'Email': o.customerEmail || 'N/A',
    'Shipping Address': o.shippingAddress || 'N/A',
    'Item Name': o.item,
    'Size': o.size,
    'Amount (INR)': o.amount,
    'UPI UTR Reference': o.utr || 'N/A',
    'Status': (o.status || '').toUpperCase()
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const colWidths = [
    { wch: 8 },  { wch: 14 }, { wch: 18 }, { wch: 20 },
    { wch: 16 }, { wch: 24 }, { wch: 40 }, { wch: 18 },
    { wch: 8 },  { wch: 14 }, { wch: 18 }, { wch: 14 }
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `HYP3_Orders_${dateStr}.xlsx`);
});

// 6. Render Products Grid
function renderProducts() {
  if (products.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
        No drops in catalog. Click <strong>+ Add New Drop</strong> to create one.
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = products.map(p => {
    return `
      <div class="product-card">
        <div class="product-card-preview">
          <img src="${p.image}" alt="${p.name}" onerror="this.src='../assets/shatter.png'">
        </div>
        <div class="product-card-body">
          <div class="product-drop-tag">Drop #${p.num}</div>
          <div class="product-card-title">${p.name}</div>
          <div class="product-card-subtitle">${p.subtitle}</div>

          <div class="product-card-row">
            <span class="product-card-price">₹${Number(p.price || 0).toLocaleString('en-IN')}</span>
            <span class="product-card-inventory" style="${p.stock < 15 ? 'color:#d97706; font-weight:600;' : ''}">${p.stock} in stock</span>
          </div>

          <div class="product-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="openEditProductModal('${p.id}')">
              Edit
            </button>
            <button class="btn btn-secondary btn-sm" style="color:#d32f2f;" onclick="deleteProduct('${p.id}')">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.deleteProduct = async function(prodId) {
  if (confirm('Are you sure you want to remove this product from the catalog?')) {
    products = products.filter(p => p.id !== prodId);
    renderProducts();

    try {
      await fetch(`/api/products/${prodId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete product on server:', err);
    }
  }
};

window.openEditProductModal = function(prodId) {
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  editingProductId = prodId;
  selectedImageFile = null;
  document.getElementById('productModalTitle').textContent = `Edit Drop #${prod.num} — ${prod.name}`;
  document.getElementById('prodNum').value = prod.num || '';
  document.getElementById('prodName').value = prod.name || '';
  document.getElementById('prodSubtitle').value = prod.subtitle || '';
  document.getElementById('prodPrice').value = prod.price || '';
  document.getElementById('prodStock').value = prod.stock || 0;
  document.getElementById('prodSizes').value = Array.isArray(prod.sizes) ? prod.sizes.join(', ') : (prod.sizes || '');
  document.getElementById('prodDesc').value = prod.description || '';

  if (prod.image) {
    uploadedImageUrl = prod.image;
    imagePreview.src = prod.image;
    dropzonePrompt.classList.add('hidden');
    imagePreviewContainer.classList.remove('hidden');
  } else {
    resetImageDropzone();
  }

  productModal.classList.add('open');
};

// 7. Image Upload Logic (Supabase Storage support)
const imageDropzone = document.getElementById('imageDropzone');
const prodImageFile = document.getElementById('prodImageFile');
const dropzonePrompt = document.getElementById('dropzonePrompt');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

imageDropzone.addEventListener('click', (e) => {
  if (e.target !== removeImageBtn) {
    prodImageFile.click();
  }
});

imageDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  imageDropzone.style.borderColor = 'var(--brand-black)';
});

imageDropzone.addEventListener('dragleave', () => {
  imageDropzone.style.borderColor = 'var(--border-light)';
});

imageDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  imageDropzone.style.borderColor = 'var(--border-light)';
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleSelectedImage(e.dataTransfer.files[0]);
  }
});

prodImageFile.addEventListener('change', () => {
  if (prodImageFile.files && prodImageFile.files[0]) {
    handleSelectedImage(prodImageFile.files[0]);
  }
});

function handleSelectedImage(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file (PNG, JPG, WEBP).');
    return;
  }
  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    dropzonePrompt.classList.add('hidden');
    imagePreviewContainer.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

removeImageBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetImageDropzone();
});

function resetImageDropzone() {
  selectedImageFile = null;
  uploadedImageUrl = '../assets/shatter.png';
  prodImageFile.value = '';
  imagePreview.src = '';
  dropzonePrompt.classList.remove('hidden');
  imagePreviewContainer.classList.add('hidden');
}

openAddProductModal.addEventListener('click', () => {
  editingProductId = null;
  selectedImageFile = null;
  document.getElementById('productModalTitle').textContent = 'Add New Drop';
  productForm.reset();
  resetImageDropzone();
  productModal.classList.add('open');
});

function closeModal() {
  productModal.classList.remove('open');
  editingProductId = null;
  selectedImageFile = null;
}

closeProductModal.addEventListener('click', closeModal);
cancelProductBtn.addEventListener('click', closeModal);

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const num = document.getElementById('prodNum').value;
  const name = document.getElementById('prodName').value.toUpperCase();
  const subtitle = document.getElementById('prodSubtitle').value;
  const price = Number(document.getElementById('prodPrice').value);
  const stock = Number(document.getElementById('prodStock').value);
  const sizes = document.getElementById('prodSizes').value.split(',').map(s => s.trim()).filter(Boolean);
  const desc = document.getElementById('prodDesc').value;

  let finalImageUrl = uploadedImageUrl;

  // If user selected a new file, upload to GCS bucket via /api/upload
  if (selectedImageFile) {
    try {
      const formData = new FormData();
      formData.append('file', selectedImageFile);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.url) {
        finalImageUrl = data.url;
      }
    } catch (err) {
      console.warn('GCS storage upload error, using local fallback:', err);
    }
  }

  const id = editingProductId || name.toLowerCase().replace(/\s+/g, '-');
  const productPayload = {
    id,
    num,
    name,
    subtitle,
    price,
    stock,
    sizes,
    image: finalImageUrl,
    description: desc
  };

  if (editingProductId) {
    const idx = products.findIndex(p => p.id === editingProductId);
    if (idx !== -1) products[idx] = productPayload;
  } else {
    products.push(productPayload);
  }

  try {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productPayload)
    });
  } catch (err) {
    console.error('Failed to save to database:', err);
  }

  renderProducts();
  closeModal();
});

// 8. Live Data Synchronization
async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const json = await res.json();
      const dbProducts = json.data || json;
      if (Array.isArray(dbProducts) && dbProducts.length > 0) {
        products = dbProducts;
        renderProducts();
      }
    }
  } catch (e) {
    console.warn('Error fetching products from server:', e);
  }
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const json = await res.json();
      const dbOrders = json.data || json;
      if (Array.isArray(dbOrders)) {
        orders = dbOrders.map(o => ({
          id: o.id,
          date: o.created_at ? new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Just now',
          customerName: o.customer_name || 'Anonymous',
          customerPhone: o.customer_phone || 'N/A',
          customerEmail: o.customer_email || '',
          shippingAddress: o.shipping_address || '',
          item: o.item,
          size: o.size,
          amount: Number(o.amount || 0),
          utr: o.utr || 'Pending',
          status: o.status || 'pending'
        }));
        renderOrders();
      }
    }
  } catch (e) {
    console.warn('Error fetching orders from server:', e);
  }
}

async function initSupabaseAndData() {
  await fetchProducts();
  await fetchOrders();
  // Poll for live orders every 5 seconds
  setInterval(fetchOrders, 5000);
}
