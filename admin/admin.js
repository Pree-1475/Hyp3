/**
 * HYP3 Client Admin Console - Vanilla JS
 * Uses first principles of Web Development: Pure JS DOM manipulation & events
 * Ready to plug into Supabase Client SDK or run in local mock preview mode.
 */

// Initial Seed / Mock Catalog
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

// Initial Seed / Mock Orders
let orders = [
  {
    id: 'ORD-98214',
    date: '2026-10-16 21:40',
    customerName: 'Aarav Sharma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'aarav.sharma@gmail.com',
    shippingAddress: '42, Indiranagar 100ft Rd, Bangalore 560038',
    item: 'SHATTER (01)',
    size: 'L',
    amount: 1199,
    utr: '429188291039',
    status: 'pending'
  },
  {
    id: 'ORD-98215',
    date: '2026-10-16 20:15',
    customerName: 'Rhea Sengupta',
    customerPhone: '+91 98112 34567',
    customerEmail: 'rhea.s@outlook.com',
    shippingAddress: 'Flat 4B, Park Street Towers, Kolkata 700016',
    item: 'SPIRAL (02)',
    size: 'M',
    amount: 1199,
    utr: '429177182901',
    status: 'confirmed'
  },
  {
    id: 'ORD-98216',
    date: '2026-10-16 18:02',
    customerName: 'Kabir Verma',
    customerPhone: '+91 99201 88471',
    customerEmail: 'kabir.v@gmail.com',
    shippingAddress: '12, Bandra West, Mumbai 400050',
    item: 'CORE (03)',
    size: 'XL',
    amount: 1199,
    utr: '429155291840',
    status: 'shipped'
  }
];

// State
let activeTab = 'orders';
let editingProductId = null;

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
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  currentUserEmail.textContent = email;
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  renderDashboard();
});

logoutBtn.addEventListener('click', () => {
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
      order.id.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
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
          <div style="font-weight:600; color:var(--brand-black);">${order.customerName}</div>
          <div style="font-size:12px; color:var(--text-secondary);">${order.customerPhone}</div>
        </td>
        <td>
          <div style="font-weight:500;">${order.item}</div>
          <div style="font-size:11.5px; color:var(--text-muted);">Size: ${order.size}</div>
        </td>
        <td style="font-weight:600; font-family:var(--font-mono);">₹${order.amount.toLocaleString('en-IN')}</td>
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
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

// Order Status Handler
window.changeOrderStatus = function(orderId, newStatus) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    renderOrders();
  }
};

orderSearch.addEventListener('input', renderOrders);
statusFilter.addEventListener('change', renderOrders);

// 5. Excel Export (.xlsx) via SheetJS
exportExcelBtn.addEventListener('click', () => {
  if (orders.length === 0) {
    alert('No orders to export.');
    return;
  }

  // Format data cleanly for spreadsheet
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
    'Status': o.status.toUpperCase()
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set automatic column widths
  const colWidths = [
    { wch: 8 },  // Sr No
    { wch: 14 }, // Order ID
    { wch: 18 }, // Date
    { wch: 20 }, // Name
    { wch: 16 }, // Phone
    { wch: 24 }, // Email
    { wch: 40 }, // Address
    { wch: 18 }, // Item
    { wch: 8 },  // Size
    { wch: 14 }, // Amount
    { wch: 18 }, // UTR
    { wch: 14 }  // Status
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

  // Trigger download
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `HYP3_Orders_${dateStr}.xlsx`);
});

// 6. Render Products as Clean Merchant Cards
function renderProducts() {
  const prodCountEl = document.getElementById('navProdCount');
  if (prodCountEl) prodCountEl.textContent = products.length;

  productsGrid.innerHTML = products.map(p => {
    return `
      <div class="merchant-product-card">
        <div class="product-card-preview">
          <img src="${p.image}" alt="${p.name}" onerror="this.src='../assets/shatter.png'">
        </div>
        <div class="product-card-body">
          <div class="product-drop-tag">Drop #${p.num}</div>
          <div class="product-card-title">${p.name}</div>
          <div class="product-card-subtitle">${p.subtitle}</div>

          <div class="product-card-row">
            <span class="product-card-price">₹${p.price.toLocaleString('en-IN')}</span>
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

window.deleteProduct = function(prodId) {
  if (confirm('Are you sure you want to remove this product from the catalog?')) {
    products = products.filter(p => p.id !== prodId);
    renderProducts();
  }
};

window.openEditProductModal = function(prodId) {
  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  editingProductId = prodId;
  document.getElementById('productModalTitle').textContent = `Edit Drop #${prod.num} — ${prod.name}`;
  document.getElementById('prodNum').value = prod.num || '';
  document.getElementById('prodName').value = prod.name || '';
  document.getElementById('prodSubtitle').value = prod.subtitle || '';
  document.getElementById('prodPrice').value = prod.price || '';
  document.getElementById('prodStock').value = prod.stock || 0;
  document.getElementById('prodSizes').value = (prod.sizes || []).join(', ');
  document.getElementById('prodDesc').value = prod.description || '';

  // Show existing image
  if (prod.image) {
    uploadedImageDataUrl = prod.image;
    imagePreview.src = prod.image;
    dropzonePrompt.classList.add('hidden');
    imagePreviewContainer.classList.remove('hidden');
  } else {
    resetImageDropzone();
  }

  productModal.classList.add('open');
};

// 7. Add Product Modal Flow & Direct Image Upload
let uploadedImageDataUrl = '../assets/shatter.png'; // fallback default

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
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImageDataUrl = e.target.result;
    imagePreview.src = uploadedImageDataUrl;
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
  uploadedImageDataUrl = '../assets/shatter.png';
  prodImageFile.value = '';
  imagePreview.src = '';
  dropzonePrompt.classList.remove('hidden');
  imagePreviewContainer.classList.add('hidden');
}

openAddProductModal.addEventListener('click', () => {
  editingProductId = null;
  document.getElementById('productModalTitle').textContent = 'Add New Drop';
  productForm.reset();
  resetImageDropzone();
  productModal.classList.add('open');
});

function closeModal() {
  productModal.classList.remove('open');
  editingProductId = null;
}

closeProductModal.addEventListener('click', closeModal);
cancelProductBtn.addEventListener('click', closeModal);

productForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const num = document.getElementById('prodNum').value;
  const name = document.getElementById('prodName').value.toUpperCase();
  const subtitle = document.getElementById('prodSubtitle').value;
  const price = Number(document.getElementById('prodPrice').value);
  const stock = Number(document.getElementById('prodStock').value);
  const sizes = document.getElementById('prodSizes').value.split(',').map(s => s.trim());
  const desc = document.getElementById('prodDesc').value;

  if (editingProductId) {
    // Update existing product
    const prod = products.find(p => p.id === editingProductId);
    if (prod) {
      prod.num = num;
      prod.name = name;
      prod.subtitle = subtitle;
      prod.price = price;
      prod.stock = stock;
      prod.image = uploadedImageDataUrl;
      prod.sizes = sizes;
      prod.description = desc;
    }
  } else {
    // Add new product
    const newProduct = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      num: num,
      name: name,
      subtitle: subtitle,
      price: price,
      stock: stock,
      image: uploadedImageDataUrl,
      sizes: sizes,
      description: desc
    };
    products.push(newProduct);
  }

  renderProducts();
  closeModal();
});

// Initialization
function renderDashboard() {
  renderOrders();
  renderProducts();
}
