// ── Custom UI Modal ──
function showModal({ type = 'alert', title = 'Notice', message, iconType = 'info', confirmText = 'OK', cancelText = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    const overlay = document.getElementById('customModalOverlay');
    if (!overlay) return resolve(type === 'prompt' ? prompt(message) : (type === 'confirm' ? confirm(message) : alert(message)));
    
    document.getElementById('cmTitle').textContent = title;
    document.getElementById('cmMessage').innerHTML = message;
    
    const iconEl = document.getElementById('cmIcon');
    if (iconType === 'danger') {
      iconEl.style.background = '#7F1D1D'; iconEl.style.color = '#FCA5A5';
      iconEl.innerHTML = '<span style="font-size: 24px;">⚠️</span>';
    } else if (iconType === 'success') {
      iconEl.style.background = 'var(--status-success-bg)'; iconEl.style.color = 'var(--status-success-text)';
      iconEl.innerHTML = '<span style="font-size: 24px;">✅</span>';
    } else {
      iconEl.style.background = 'var(--accent-muted)'; iconEl.style.color = 'var(--accent)';
      iconEl.innerHTML = '<span style="font-size: 24px;">ℹ️</span>';
    }

    const btnConfirm = document.getElementById('cmBtnConfirm');
    const btnCancel = document.getElementById('cmBtnCancel');
    const inputWrapper = document.getElementById('cmInputWrapper');
    const inputEl = document.getElementById('cmInput');

    btnConfirm.textContent = confirmText;
    btnCancel.textContent = cancelText;
    
    if (danger) {
      btnConfirm.style.background = '#7F1D1D'; btnConfirm.style.color = '#FCA5A5';
      btnConfirm.style.border = 'none';
    } else {
      btnConfirm.style.background = 'var(--accent)'; btnConfirm.style.color = '#fff';
      btnConfirm.style.border = 'none';
    }

    btnCancel.style.display = (type === 'alert') ? 'none' : 'block';
    inputWrapper.style.display = (type === 'prompt') ? 'block' : 'none';
    if (type === 'prompt') { inputEl.value = ''; setTimeout(() => inputEl.focus(), 100); }

    overlay.style.display = 'flex';

    function cleanup() {
      overlay.style.display = 'none';
      btnConfirm.onclick = null;
      btnCancel.onclick = null;
    }

    btnConfirm.onclick = () => { cleanup(); resolve(type === 'prompt' ? inputEl.value : true); };
    btnCancel.onclick = () => { cleanup(); resolve(type === 'prompt' ? null : false); };
  });
}

let currentFilter = 'all';
const API_URL = window.location.origin;
let NGROK_URL = window.location.origin;

// ── Theme toggle ──
const root = document.documentElement;
const saved = localStorage.getItem('theme');
if (saved === 'light') root.classList.add('light');

document.getElementById('themeToggle').addEventListener('click', () => {
  const isLight = root.classList.toggle('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// ── Sidebar nav ──
document.querySelectorAll('.sidebar-nav-icon').forEach(icon => {
  icon.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-nav-icon').forEach(i => i.classList.remove('active'));
    icon.classList.add('active');

    if (icon.dataset.view) {
      ['dashboardView', 'menuView', 'ridersView', 'customersView', 'settingsView'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
      });

      const target = document.getElementById(`${icon.dataset.view}View`);
      if(target) target.style.display = 'block';

      if (icon.dataset.view === 'dashboard') { loadStats(); loadOrders(currentFilter); }
      else if (icon.dataset.view === 'menu') loadMenuConfig();
      else if (icon.dataset.view === 'riders') loadRidersConfig();
      else if (icon.dataset.view === 'customers') loadCustomersConfig();
      else if (icon.dataset.view === 'settings') loadSettingsConfig();
    }
  });
});

// ── Refresh spin ──
document.getElementById('refreshBtn').addEventListener('click', () => {
  const svg = document.querySelector('#refreshIco svg');
  svg.style.transition = 'transform 0.5s ease';
  svg.style.transform = 'rotate(360deg)';
  setTimeout(() => { svg.style.transition = 'none'; svg.style.transform = ''; }, 520);
  loadOrders(currentFilter);
  loadStats();
});

// ── Core App Logic ──
async function loadConfig() {
  try {
    const statusRes = await fetch(`${API_URL}/api/setup/status`);
    const status = await statusRes.json();
    if (status.needsSetup) {
      document.getElementById('setupWizard').style.display = 'flex';
      setTimeout(() => { initWizMap(); wizMap.invalidateSize(); }, 500); // Allow DOM reflow
      return false; // Skip load
    }

    const response = await fetch(`${API_URL}/api/config`);
    const config = await response.json();
    if (config.ngrokUrl) NGROK_URL = config.ngrokUrl;

    const display = document.getElementById('ngrokDisplay');
    if (display) {
      display.innerHTML = `<div class="live-dot-sm"></div> &nbsp; Public URL &nbsp;·&nbsp; <span class="link-text" style="color:var(--text);">${NGROK_URL}/restaurant</span>`;
      display.href = NGROK_URL;
    }
    return true;
  } catch (error) {
    console.error('Failed to load config:', error);
    return true;
  }
}

async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/api/restaurant/stats`);
    const stats = await response.json();

    document.getElementById('todayOrders').textContent = stats.todayOrders;
    document.getElementById('pendingOrders').textContent = stats.pendingOrders;
    document.getElementById('activeOrders').textContent = stats.activeOrders;
    document.getElementById('todayRevenue').textContent = '₹' + stats.todayRevenue;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

async function loadOrders(status = 'all') {
  try {
    const url = status === 'all'
      ? `${API_URL}/api/restaurant/orders`
      : `${API_URL}/api/restaurant/orders?status=${status}`;

    const response = await fetch(url);
    const orders = await response.json();

    document.getElementById('ordersHeaderTitle').textContent = `Orders — ${orders.length} result${orders.length !== 1 ? 's' : ''}`;

    const container = document.getElementById('ordersContainer');
    if (orders.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 60px 20px; color: var(--muted);"><div style="font-size: 64px; margin-bottom: 20px;">📭</div><h3>No orders found</h3><p>Orders will appear here when customers place them</p></div>`;
      return;
    }

    if (container.innerHTML.includes('📭')) {
      container.innerHTML = '';
    }

    const newOrderIds = new Set(orders.map(o => o.orderId));

    // Remove stale orders
    Array.from(container.children).forEach(child => {
      if (child.id && child.id.startsWith('order-card-')) {
        const oId = child.id.replace('order-card-', '');
        if (!newOrderIds.has(oId)) child.remove();
      }
    });

    // Update or insert orders
    orders.forEach((order, index) => {
      const existingCard = document.getElementById(`order-card-${order.orderId}`);
      if (existingCard) {
        if (existingCard.dataset.updated !== String(order.updatedAt)) {
          existingCard.dataset.updated = order.updatedAt;
          existingCard.innerHTML = getOrderCardInner(order);
        }
        if (container.children[index] !== existingCard) {
          container.insertBefore(existingCard, container.children[index]);
        }
      } else {
        const card = document.createElement('div');
        card.className = 'order-card';
        card.id = `order-card-${order.orderId}`;
        card.dataset.updated = order.updatedAt;
        card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
        card.style.marginBottom = '20px';
        card.innerHTML = getOrderCardInner(order);

        if (container.children[index]) {
          container.insertBefore(card, container.children[index]);
        } else {
          container.appendChild(card);
        }
      }
    });
  } catch (error) {
    console.error('Failed to load orders:', error);
  }
}

function createOrderCard(order) {
  return `
    <div class="order-card" id="order-card-${order.orderId}" data-updated="${order.updatedAt}" >
      ${getOrderCardInner(order)}
    </div>
  `;
}

function getOrderCardInner(order) {
  const timestamp = new Date(order.createdAt).toLocaleString('en-IN');
  const STATUS_LABELS = {
    pending: 'PENDING',
    confirmed: 'CONFIRMED',
    cooking: 'COOKING',
    out_for_delivery: 'OUT FOR DELIVERY',
    delivered: 'DELIVERED',
    cancelled: 'CANCELLED'
  };
  let statusText = STATUS_LABELS[order.status] || order.status.toUpperCase();
  let statusClass = 'status-info';

  if (order.status === 'delivered') statusClass = 'status-success';
  else if (order.status === 'pending' || order.status === 'cancelled') statusClass = 'status-warning';

  let actionButtonsHtml = '';
  if (order.status === 'pending') {
    actionButtonsHtml = `
      <button class="btn-primary" onclick="updateStatus('${order.orderId}', 'confirmed')">Confirm Order</button>
      <button class="btn-secondary" onclick="updateStatus('${order.orderId}', 'cancelled')">Cancel</button>
    `;
  } else if (order.status === 'confirmed') {
    actionButtonsHtml = `<button class="btn-primary" onclick="updateStatus('${order.orderId}', 'cooking')">Start Cooking</button>`;
  } else if (order.status === 'cooking') {
    actionButtonsHtml = `
      <button class="btn-primary" onclick="showRiderForm('${order.orderId}')">Out for Delivery</button>
      <div id="rider-form-${order.orderId}" style="display: none; align-items:center; gap:10px; margin-left:15px;">
        <select id="rider-select-${order.orderId}" style="padding:10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);"></select>
        <button class="btn-secondary" onclick="assignRider('${order.orderId}')">Assign</button>
      </div>`;
  } else if (order.status === 'out_for_delivery') {
    const riderLink = `${NGROK_URL}/rider?order=${order.orderId}`;
    actionButtonsHtml = `
      <div style="font-size:13px; color:var(--muted); margin-right:15px; display:flex; align-items:center;">Tracking: <a href="${riderLink}" target="_blank" style="color:var(--accent); margin-left:5px;">Link</a></div>
      <button class="btn-primary" onclick="updateStatus('${order.orderId}', 'delivered')">Mark as Delivered</button>
    `;
  }

  let infoBanner = `
    <div style="display:flex; align-items:center; gap:8px; font-size:14px; margin-bottom:8px;">
      <span class="ico" style="color:var(--muted)"><svg width="14" height="14"><use href="#ic-phone"/></svg></span>
      ${order.customerPhone}
    </div>
    <div style="display:flex; align-items:flex-start; gap:8px; font-size:14px; color:var(--muted);">
      <span class="ico" style="margin-top:2px;"><svg width="14" height="14"><use href="#ic-mappin"/></svg></span>
      <span style="flex:1">${order.deliveryAddress?.address || 'Address not provided'}</span>
    </div>`;

  if (order.deliveryPerson?.trackingActive && order.status === 'out_for_delivery') {
    infoBanner += `<div style="margin-top:8px; color:var(--accent); font-size:13px; font-weight:600;">• Live tracking active</div>`;
  }

  const itemsHtml = order.items.map(item => `
    <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
      <span><span style="color:var(--muted); font-weight:600; margin-right:6px;">${item.quantity}x</span> ${item.name}</span>
      <span style="color:var(--muted);">₹${item.price * item.quantity}</span>
    </div>
  `).join('');

  return `
    <div class="order-card-grid">
      <!-- Col 1: Meta -->
      <div class="col-meta" style="display:flex; flex-direction:column;">
        <div class="font-bold-large" style="font-size:16px;">Order #${order.orderId}</div>
        <div style="color:var(--muted); font-size:13px; margin-bottom:16px;">${timestamp}</div>
        ${infoBanner}
      </div>

      <!-- Col 2: Items -->
      <div class="col-items" style="padding: 0 24px; border-left:1px solid var(--border); border-right:1px solid var(--border);">
        <div class="font-label-small" style="margin-bottom:16px;">Order Summary</div>
        ${itemsHtml}
      </div>

      <!-- Col 3: Status & Totals -->
      <div class="col-totals" style="display:flex; flex-direction:column; justify-content:space-between; align-items:flex-end; padding-left:16px;">
        <div class="status-pill ${statusClass}">${statusText}</div>
        <div style="text-align:right; margin-top:20px;">
          <div class="font-label-small" style="margin-bottom:4px;">Total Amount</div>
          <div class="font-bold-large">₹${order.total}</div>
        </div>
      </div>
    </div>
    ${actionButtonsHtml ? `<div class="order-actions-footer">${actionButtonsHtml}</div>` : ''}
  `;
}

async function showRiderForm(orderId) {
  document.getElementById(`rider-form-${orderId}`).style.display = 'flex';
  const select = document.getElementById(`rider-select-${orderId}`);
  if (select.children.length === 0) {
    try {
      select.innerHTML = '<option value="">Loading riders...</option>';
      const res = await fetch(`${API_URL}/api/restaurant/riders`);
      const riders = await res.json();
      if (riders.length === 0) {
        select.innerHTML = '<option value="">No riders saved! Please add one in Rider Settings.</option>';
      } else {
        select.innerHTML = '<option value="">Select a Rider</option>' + riders.map(r => `<option value="${r._id}">${r.name} (${r.phone})</option>`).join('');
      }
    } catch (e) { select.innerHTML = '<option value="">Error loading</option>'; }
  }
}

async function assignRider(orderId) {
  const riderId = document.getElementById(`rider-select-${orderId}`).value;
  if (!riderId) return showModal({ iconType: 'danger', message: 'Please select a rider' });

  try {
    const response = await fetch(`${API_URL}/api/restaurant/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'out_for_delivery', riderId })
    });
    if (response.ok) {
      await showModal({ iconType: 'success', message: 'Rider assigned successfully!' });
      loadOrders(currentFilter);
      loadStats();
    } else { await showModal({ iconType: 'danger', message: 'Failed to assign rider' }); }
  } catch (error) { await showModal({ iconType: 'danger', message: 'Failed to assign rider' }); }
}

async function updateStatus(orderId, newStatus) {
  const confirmResult = await showModal({ type: 'confirm', title: 'Confirm Status Update', message: `Update order status to ${newStatus.replace('_', ' ')}?` });
  if (!confirmResult) return;
  try {
    const response = await fetch(`${API_URL}/api/restaurant/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (response.ok) {
      loadOrders(currentFilter);
      loadStats();
    } else { await showModal({ iconType: 'danger', message: 'Failed to update status' }); }
  } catch (error) { await showModal({ iconType: 'danger', message: 'Failed to update status' }); }
}

function copyLink(link) {
  navigator.clipboard.writeText(link)
    .then(() => showModal({ iconType: 'success', message: 'Link copied!' }))
    .catch(() => showModal({ iconType: 'danger', message: 'Failed to copy' }));
}

async function loadRidersConfig() {
  const container = document.getElementById('ridersContainer');

  container.innerHTML = '<p style="color:var(--muted)">Loading riders...</p>';
  try {
    const res = await fetch(`${API_URL}/api/restaurant/riders`);
    const riders = await res.json();

    let html = `
      <div style="background: var(--surface); border: 1px solid var(--border); padding: 24px; border-radius: var(--radius); margin-bottom: 24px;">
        <h3 style="margin-bottom:15px;">Register a New Rider</h3>
        <input type="text" id="newRiderName" placeholder="Rider Name" style="padding: 10px; margin-bottom: 15px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); width:100%;" />
        <input type="text" id="newRiderPhone" placeholder="Phone Number" style="padding: 10px; margin-bottom: 15px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); width:100%;" />
        <input type="text" id="newRiderChatId" placeholder="Telegram Chat ID (required)" style="padding: 10px; margin-bottom: 15px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); width:100%;" />
        <button onclick="addNewRider()" style="background:var(--accent); border:none; border-radius:8px; padding:12px 24px; color:white; font-weight:600; cursor:pointer;">+ Add Rider</button>
        <p style="color: var(--muted); font-size: 13px; margin-top: 15px;">* Riders must send a message to your Telegram Rider Bot to fetch their Chat ID via API.</p>
      </div>
      <h3 style="margin-bottom:15px; margin-top:30px;">Your Saved Riders</h3>
    `;

    if (riders.length === 0) {
      html += '<div style="background:var(--surface); border:1px solid var(--border); padding:20px; border-radius:var(--radius); text-align:center; color:var(--muted);">No riders registered yet.</div>';
    } else {
      riders.forEach(r => {
        html += `
           <div style="background: var(--surface); padding: 20px; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
             <div>
               <strong>${r.name}</strong> • <span>${r.phone}</span>
               <div style="font-size:13px; color:var(--muted); margin-top:5px;">Telegram Chat ID: ${r.telegramChatId}</div>
             </div>
             <button onclick="deleteRider('${r._id}')" style="color: #ef476f; border: 1px solid #ef476f; padding: 8px 16px; border-radius: 6px; background: transparent; cursor: pointer; font-weight:600;">Delete</button>
           </div>
         `;
      });
    }

    container.innerHTML = html;
  } catch (e) { container.innerHTML = '<p style="color:var(--muted)">Error loading riders.</p>'; }
}

async function addNewRider() {
  const name = document.getElementById('newRiderName').value;
  const phone = document.getElementById('newRiderPhone').value;
  const telegramChatId = document.getElementById('newRiderChatId').value;
  if (!name || !phone || !telegramChatId) return showModal({ iconType: 'danger', message: 'All fields required' });

  await fetch(`${API_URL}/api/restaurant/riders`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, telegramChatId })
  });
  loadRidersConfig();
}

async function deleteRider(id) {
  if (!(await showModal({ type: 'confirm', title: 'Delete Rider', iconType: 'danger', danger: true, message: 'Permanently delete this rider?' }))) return;
  await fetch(`${API_URL}/api/restaurant/riders/${id}`, { method: 'DELETE' });
  loadRidersConfig();
}

// ── Tab Listeners ──
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    currentFilter = tab.dataset.status;
    document.getElementById('refreshBtn').style.display = 'flex';
    loadOrders(currentFilter);
  });
});

// ── Initialization ──
setInterval(() => {
  if (document.getElementById('setupWizard') && document.getElementById('setupWizard').style.display !== 'none') return;
  // Only refresh if dashboard is visible
  if (document.getElementById('dashboardView') && document.getElementById('dashboardView').style.display !== 'none') {
    loadOrders(currentFilter);
    loadStats();
  }
}, 10000);

loadConfig().then((proceed) => {
  if (proceed) {
    loadStats();
    loadOrders('all');
  }
});

// ── Setup Wizard Logic ──
let wizMap;
let wizMarker;

function initWizMap() {
  if (wizMap) return;
  wizMap = L.map('wizMap').setView([40.7128, -74.0060], 13); // Default New York
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(wizMap);

  wizMap.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    updateWizMarker(lat, lng);
    reverseGeocode(lat, lng);
  });
}

function updateWizMarker(lat, lng) {
  if (wizMarker) {
    wizMarker.setLatLng([lat, lng]);
  } else {
    wizMarker = L.marker([lat, lng]).addTo(wizMap);
  }
  wizMap.setView([lat, lng], 16);
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    if (data && data.display_name) {
      document.getElementById('wizResLoc').value = data.display_name;
    }
  } catch (e) { console.error('Geocode failed', e); }
}

function getGpsLocation() {
  const btn = document.getElementById('wizGpsBtn');
  const orgText = btn.innerHTML;
  btn.innerHTML = '⏳ Locating...';
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateWizMarker(latitude, longitude);
        reverseGeocode(latitude, longitude);
        btn.innerHTML = orgText;
      },
      (error) => {
        showModal({ iconType: 'danger', message: 'Unable to retrieve location: ' + error.message });
        btn.innerHTML = orgText;
      }
    );
  } else {
    showModal({ iconType: 'danger', message: 'Geolocation is not supported by your browser.' });
    btn.innerHTML = orgText;
  }
}

let windowWizardMenuChoice = false;
function setWizardMenuChoice(choice) { windowWizardMenuChoice = choice; }

let wizWaPollingInterval = null;

function applyWizWAStatus(data) {
  const img = document.getElementById('wizWaQRImage');
  const status = document.getElementById('wizWaStatus');
  if (data.status === 'connected') {
    status.textContent = 'Account Connected!';
    status.style.color = '#10B981';
    img.style.display = 'none';
    if (wizWaPollingInterval) { clearInterval(wizWaPollingInterval); wizWaPollingInterval = null; }
  } else if (data.status === 'qr_pending') {
    status.textContent = 'Scan the QR code in WhatsApp Linked Devices';
    status.style.color = '#F59E0B';
    if (data.qr) { img.src = data.qr; img.style.display = 'block'; }
  } else {
    status.textContent = 'Disconnected';
    status.style.color = '#EF4444';
    img.style.display = 'none';
  }
}

async function pollWizWAStatus() {
  try {
    const res = await fetch(`${API_URL}/api/whatsapp/qr`);
    const data = await res.json();
    applyWizWAStatus(data);
  } catch(e) { }
}

async function initWizWA() {
  document.getElementById('wizWaStatus').textContent = 'Generating QR...';
  try {
    await fetch(`${API_URL}/api/whatsapp/connect`, { method: 'POST' });
    if (!wizWaPollingInterval) wizWaPollingInterval = setInterval(pollWizWAStatus, 3000);
    pollWizWAStatus();
  } catch(e) { document.getElementById('wizWaStatus').textContent = 'Failed to connect. Make sure server is running.'; }
}


async function nextWizardStep(step) {
  if (step === 1) {
    if (!document.getElementById('wizResName').value || !document.getElementById('wizResLoc').value)
      return showModal({ iconType: 'danger', message: 'Restaurant Name and Location are required.' });
  }
  if (step === 6 && !document.getElementById('wizTgRider').value) {
    return showModal({ iconType: 'danger', message: 'Rider Bot Token is mandatory for rider tracking.' });
  }
  if (step === 7 && !document.getElementById('wizNgrok').value) {
    return showModal({ iconType: 'danger', message: 'Ngrok URL is required.' });
  }

  // If entering step 5, start QR polling
  if (step === 4) {
    initWizWA();
  }
  // If leaving step 5, stop polling just to be safe
  if (step === 5 && wizWaPollingInterval) {
    clearInterval(wizWaPollingInterval);
    wizWaPollingInterval = null;
  }
  
  document.getElementById(`wizardStep${step}`).style.display = 'none';
  document.getElementById(`wizardStep${step + 1}`).style.display = 'block';
}

function prevWizardStep(step) {
  document.getElementById(`wizardStep${step}`).style.display = 'none';
  document.getElementById(`wizardStep${step - 1}`).style.display = 'block';
}

async function finishWizard() {
  const btn = document.getElementById('finishWizBtn');
  btn.textContent = 'Setting up...';
  btn.disabled = true;

  try {
    const payload = {
      restaurantName: document.getElementById('wizResName').value,
      restaurantLocation: document.getElementById('wizResLoc').value,
      seedDefaultMenu: windowWizardMenuChoice,
      ngrokUrl: document.getElementById('wizNgrok').value,
      telegramBotToken: document.getElementById('wizTgBot').value,
      telegramRiderBotToken: document.getElementById('wizTgRider').value,
      whatsappToken: document.getElementById('wizWaToken').value,
      phoneNumberId: document.getElementById('wizWaPhone').value
    };

    const res = await fetch(`${API_URL}/api/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      document.getElementById('setupWizard').style.display = 'none';
      await loadConfig();
      loadStats();
      loadOrders('all');
    } else {
      await showModal({ iconType: 'danger', message: 'Setup failed. Check console.' });
      btn.textContent = 'Go to Dashboard';
      btn.disabled = false;
    }
  } catch (err) {
    await showModal({ iconType: 'danger', message: 'Setup error.' });
    btn.textContent = 'Go to Dashboard';
    btn.disabled = false;
  }
}



// ── Menu Management ──
async function loadMenuConfig() {
  const container = document.getElementById('menuItemsContainer');
  container.innerHTML = '<p style="color:var(--muted)">Loading menu items...</p>';
  try {
    const res = await fetch(`${API_URL}/api/restaurant/menu`);
    const menuItems = await res.json();

    let html = `
      <div style="background: var(--surface); border: 1px solid var(--border); padding: 24px; border-radius: var(--radius); margin-bottom: 24px;">
        <h3 style="margin-bottom:15px;">Add New Menu Item</h3>
        <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
          <input type="text" id="newMenuId" placeholder="ID (e.g. coffee_black)" style="padding: 10px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); flex: 1; min-width:150px;" />
          <input type="text" id="newMenuName" placeholder="Name (e.g. ☕ Black Coffee)" style="padding: 10px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); flex: 1; min-width:200px;" />
          <input type="number" id="newMenuPrice" placeholder="Price (₹)" style="padding: 10px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); flex: 0.5; min-width:100px;" />
        </div>
        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
          <input type="text" id="newMenuCategory" placeholder="Category (e.g. Beverages)" style="padding: 10px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); flex: 1;" />
          <input type="text" id="newMenuDesc" placeholder="Description (e.g. Hot brewed coffee)" style="padding: 10px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text); flex: 2;" />
        </div>
        <button onclick="addNewMenuItem()" style="background:var(--green); border:none; border-radius:8px; padding:12px 24px; color:white; font-weight:600; cursor:pointer;">+ Add Item</button>
      </div>
      <h3 style="margin-bottom:15px; margin-top:30px;">Active Menu Items</h3>
    `;

    if (menuItems.length === 0) {
      html += '<div style="background:var(--surface); border:1px solid var(--border); padding:20px; border-radius:var(--radius); text-align:center; color:var(--muted);">No items in menu.</div>';
    } else {
      // Group by category
      const grouped = {};
      menuItems.forEach(i => {
        if (!grouped[i.category]) grouped[i.category] = [];
        grouped[i.category].push(i);
      });

      for (const category in grouped) {
        html += `<h4 style="color:var(--accent-2); margin-top:20px; margin-bottom:10px;">${category}</h4>`;
        grouped[category].forEach(item => {
          html += `
             <div style="background: var(--surface); padding: 20px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
               <div>
                 <strong>${item.name}</strong> • <span style="font-family: 'IBM Plex Mono', monospace; font-weight:600; color:var(--accent-2);">₹${item.price}</span>
                 <div style="font-size:13px; color:var(--muted); margin-top:5px;">${item.description || 'No description'} — ID: ${item.id}</div>
               </div>
               <button onclick="deleteMenuItem('${item._id}')" style="color: #ef476f; border: 1px solid #ef476f; padding: 8px 16px; border-radius: 6px; background: transparent; cursor: pointer; font-weight:600;">Delete</button>
             </div>
           `;
        });
      }
    }

    container.innerHTML = html;
  } catch (e) { container.innerHTML = '<p style="color:var(--muted)">Error loading menu.</p>'; }
}

async function addNewMenuItem() {
  const id = document.getElementById('newMenuId').value;
  const name = document.getElementById('newMenuName').value;
  const price = document.getElementById('newMenuPrice').value;
  const category = document.getElementById('newMenuCategory').value;
  const description = document.getElementById('newMenuDesc').value;

  if (!id || !name || !price || !category) return showModal({ iconType: 'danger', message: 'ID, Name, Price, and Category are required' });

  await fetch(`${API_URL}/api/restaurant/menu`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, price: Number(price), category, description })
  });
  loadMenuConfig();
}

async function deleteMenuItem(dbId) {
  if (!(await showModal({ type: 'confirm', title: 'Delete Menu Item', iconType: 'danger', danger: true, message: 'Permanently delete this menu item?' }))) return;
  await fetch(`${API_URL}/api/restaurant/menu/${dbId}`, { method: 'DELETE' });
  loadMenuConfig();
}

// ── Customers CRM ──
async function loadCustomersConfig() {
  const container = document.getElementById('customersContainer');
  container.innerHTML = '<p style="color:var(--muted)">Loading customers...</p>';
  try {
    const res = await fetch(`${API_URL}/api/restaurant/crm/customers`);
    const customers = await res.json();
    
    let html = `
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow);">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
          <thead style="background: var(--surface-2); border-bottom: 1px solid var(--border);">
            <tr>
              <th style="padding: 16px; font-weight: 600; color: var(--muted); text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Customer</th>
              <th style="padding: 16px; font-weight: 600; color: var(--muted); text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Platform</th>
              <th style="padding: 16px; font-weight: 600; color: var(--muted); text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Orders</th>
              <th style="padding: 16px; font-weight: 600; color: var(--muted); text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">LTV (Spent)</th>
              <th style="padding: 16px; font-weight: 600; color: var(--muted); text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Joined</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (customers.length === 0) {
      html += '<tr><td colspan="5" style="padding: 30px; text-align: center; color: var(--muted);">No customers registered yet.</td></tr>';
    } else {
      customers.forEach(c => {
        html += `
          <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;">
            <td style="padding: 16px;">
              <div style="font-weight: 600; color: var(--text);">${c.name || 'Unknown'}</div>
              <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">${c.phone || c.platformId}</div>
            </td>
            <td style="padding: 16px;">
              <span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${c.platform==='whatsapp'?'#dcf8c6':'#e1f5fe'}; color: ${c.platform==='whatsapp'?'#075e54':'#0288d1'};">
                ${c.platform}
              </span>
            </td>
            <td style="padding: 16px; font-weight: 500;">${c.totalOrders}</td>
            <td style="padding: 16px; font-weight: 600; color: var(--accent);">₹${c.totalSpent}</td>
            <td style="padding: 16px; color: var(--muted);">${new Date(c.joinedAt).toLocaleDateString('en-IN')}</td>
          </tr>
        `;
      });
    }
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
  } catch(e) { 
    container.innerHTML = '<p style="color:var(--muted)">Error loading customers.</p>'; 
  }
}

// ── Settings Vault ──
async function loadSettingsConfig() {
  try {
    const res = await fetch(`${API_URL}/api/settings/config`);
    const data = await res.json();
    document.getElementById('setNgrok').value = data.ngrokUrl || '';
    document.getElementById('setTelegram').value = data.telegramBotToken || '';
    document.getElementById('setTelegramRider').value = data.telegramRiderBotToken || '';
    document.getElementById('setWhatsapp').value = data.whatsappToken || '';
    document.getElementById('setPhoneId').value = data.phoneNumberId || '';
  } catch(e) { console.error('Failed to load settings', e); }
}

async function saveSettings() {
  const btn = document.querySelector('#settingsView .btn-primary');
  btn.textContent = 'Saving...';
  
  const payload = {
    ngrokUrl: document.getElementById('setNgrok').value,
    telegramBotToken: document.getElementById('setTelegram').value,
    telegramRiderBotToken: document.getElementById('setTelegramRider').value,
    whatsappToken: document.getElementById('setWhatsapp').value,
    phoneNumberId: document.getElementById('setPhoneId').value
  };

  try {
    await fetch(`${API_URL}/api/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    document.getElementById('settingsFeedback').style.display = 'block';
    setTimeout(() => { document.getElementById('settingsFeedback').style.display = 'none'; }, 3000);
  } catch(e) {
    await showModal({ iconType: 'danger', message: 'Failed to save settings' });
  } finally {
    btn.textContent = 'Save Configuration';
    loadSettingsConfig(); // Reload to get newly masked values
  }
}

// ── WhatsApp Personal (Baileys) ──
let waPollingInterval = null;

function applyWAStatus(data) {
  const badge = document.getElementById('waBadge');
  const qrSection = document.getElementById('waQRSection');
  const connectedInfo = document.getElementById('waConnectedInfo');
  const connectBtn = document.getElementById('waConnectBtn');
  const disconnectBtn = document.getElementById('waDisconnectBtn');

  if (data.status === 'connected') {
    badge.textContent = 'Connected';
    badge.style.background = '#052E16';
    badge.style.color = '#4ADE80';
    qrSection.style.display = 'none';
    connectedInfo.style.display = 'block';
    document.getElementById('waPhoneDisplay').textContent = data.phone ? `+${data.phone}` : '';
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'block';
  } else if (data.status === 'qr_pending') {
    badge.textContent = 'Scan QR';
    badge.style.background = '#422006';
    badge.style.color = '#FBBF24';
    qrSection.style.display = 'block';
    connectedInfo.style.display = 'none';
    if (data.qr) document.getElementById('waQRImage').src = data.qr;
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'block';
  } else {
    badge.textContent = 'Disconnected';
    badge.style.background = '';
    badge.style.color = '';
    qrSection.style.display = 'none';
    connectedInfo.style.display = 'none';
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
  }
}

async function pollWAStatus() {
  try {
    const res = await fetch(`${API_URL}/api/whatsapp/qr`);
    const data = await res.json();
    applyWAStatus(data);
    if (data.status === 'connected' && waPollingInterval) {
      clearInterval(waPollingInterval);
      waPollingInterval = null;
    }
  } catch(e) { /* silent */ }
}

async function waConnect() {
  document.getElementById('waConnectBtn').textContent = 'Connecting...';
  try {
    await fetch(`${API_URL}/api/whatsapp/connect`, { method: 'POST' });
    if (!waPollingInterval) waPollingInterval = setInterval(pollWAStatus, 4000);
    pollWAStatus();
  } catch(e) { await showModal({ iconType: 'danger', message: 'Failed to initiate connection.' }); }
}

async function waDisconnect() {
  if (!(await showModal({ type:'confirm', title:'Disconnect WhatsApp', message:'Disconnect this WhatsApp account?' }))) return;
  try {
    await fetch(`${API_URL}/api/whatsapp/disconnect`, { method: 'POST' });
    if (waPollingInterval) { clearInterval(waPollingInterval); waPollingInterval = null; }
    applyWAStatus({ status: 'disconnected' });
  } catch(e) { await showModal({ iconType: 'danger', message: 'Failed to disconnect.' }); }
}

// Kick off status check when settings tab is opened
const _origLoadSettings = loadSettingsConfig;
loadSettingsConfig = async function() {
  await _origLoadSettings();
  pollWAStatus();
  if (!waPollingInterval) waPollingInterval = setInterval(pollWAStatus, 5000);
};

// ── Danger Zone ───────────────────────────────────────────────────
async function clearCustomerData() {
  if (!(await showModal({ type:'confirm', title: 'Clear Customers', iconType:'danger', danger:true, message: '🚨 Are you sure you want to permanently delete all Customer CRM data? This cannot be undone.' }))) return;
  try {
    const res = await fetch(`${API_URL}/api/settings/clear-customers`, { method: 'DELETE' });
    if (res.ok) { await showModal({ iconType:'success', message: 'Customer data cleared successfully.' }); loadCustomersConfig(); }
    else await showModal({ iconType:'danger', message: 'Failed to clear customer data.' });
  } catch (e) { await showModal({ iconType:'danger', message: 'Error: ' + e.message }); }
}

async function clearRiderData() {
  if (!(await showModal({ type:'confirm', title: 'Clear Riders', iconType:'danger', danger:true, message: '🚨 Are you sure you want to permanently delete all Rider data? This cannot be undone.' }))) return;
  try {
    const res = await fetch(`${API_URL}/api/settings/clear-riders`, { method: 'DELETE' });
    if (res.ok) { await showModal({ iconType:'success', message: 'Rider data cleared successfully.' }); loadRidersConfig(); }
    else await showModal({ iconType:'danger', message: 'Failed to clear rider data.' });
  } catch (e) { await showModal({ iconType:'danger', message: 'Error: ' + e.message }); }
}

async function clearOrderData() {
  if (!(await showModal({ type:'confirm', title: 'Clear Orders', iconType:'danger', danger:true, message: '🚨 Are you sure you want to permanently delete all Order data? This cannot be undone.' }))) return;
  try {
    const res = await fetch(`${API_URL}/api/settings/clear-orders`, { method: 'DELETE' });
    if (res.ok) { await showModal({ iconType:'success', message: 'Order data cleared successfully.' }); location.reload(); }
    else await showModal({ iconType:'danger', message: 'Failed to clear order data.' });
  } catch (e) { await showModal({ iconType:'danger', message: 'Error: ' + e.message }); }
}

async function clearAllSettings() {
  const p = await showModal({ type: 'prompt', title: 'Factory Reset', iconType: 'danger', danger: true, message: '🚨 DANGER: This will factory reset the system, clear ALL data/settings, and disconnect integrations. Type "RESET" to confirm:' });
  if (p !== 'RESET') return;
  try {
    const res = await fetch(`${API_URL}/api/settings/reset-all`, { method: 'DELETE' });
    if (res.ok) {
      await showModal({ iconType:'success', message: 'System reset successfully. Restarting setup wizard.' });
      location.reload();
    } else await showModal({ iconType:'danger', message: 'Failed to reset system.' });
  } catch (e) { await showModal({ iconType:'danger', message: 'Error: ' + e.message }); }
}



