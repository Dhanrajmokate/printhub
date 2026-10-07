// PrintHub Shop Partner Desktop App Client Logic
let currentConfig = {
  backendUrl: 'http://localhost:8000',
  autoPrint: false,
  soundAlerts: true,
  bwPrinter: '',
  colorPrinter: '',
  token: ''
};

let queueOrders = [];
let historyOrders = [];
let sseConnection = null;

// Initialize App
window.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupUIEvents();
  await loadAppConfig();
  await loadPrinters();
  await connectToBackend();
});

// Setup Navigation Tabs
function setupTabs() {
  const tabs = [
    { btn: 'tabQueueBtn', panel: 'panelQueue' },
    { btn: 'tabHistoryBtn', panel: 'panelHistory' },
    { btn: 'tabSettingsBtn', panel: 'panelSettings' }
  ];

  tabs.forEach(({ btn, panel }) => {
    document.getElementById(btn).addEventListener('click', () => {
      tabs.forEach((t) => {
        document.getElementById(t.panel).classList.add('hidden');
        document.getElementById(t.btn).classList.remove('border-indigo-500', 'text-indigo-400');
        document.getElementById(t.btn).classList.add('border-transparent', 'text-slate-400');
      });
      document.getElementById(panel).classList.remove('hidden');
      document.getElementById(btn).classList.add('border-indigo-500', 'text-indigo-400');
      document.getElementById(btn).classList.remove('border-transparent', 'text-slate-400');
    });
  });
}

// Setup User Interface Events
function setupUIEvents() {
  // Auto-Print Toggle
  const autoPrintToggle = document.getElementById('autoPrintToggle');
  const toggleDot = document.getElementById('toggleDot');
  const statusText = document.getElementById('autoPrintStatusText');

  autoPrintToggle.addEventListener('change', async (e) => {
    currentConfig.autoPrint = e.target.checked;
    updateToggleUI();
    await window.electronAPI.saveConfig(currentConfig);
  });

  // Sound Toggle
  document.getElementById('soundToggleBtn').addEventListener('click', async () => {
    currentConfig.soundAlerts = !currentConfig.soundAlerts;
    document.getElementById('soundLabel').innerText = currentConfig.soundAlerts ? 'Sound ON' : 'Sound OFF';
    document.getElementById('soundIcon').innerText = currentConfig.soundAlerts ? '🔔' : '🔕';
    await window.electronAPI.saveConfig(currentConfig);
  });

  // Refresh
  document.getElementById('refreshQueueBtn').addEventListener('click', fetchQueue);

  // Open Proofs
  document.getElementById('openProofFolderBtn').addEventListener('click', () => {
    window.electronAPI.openProofFolder();
  });

  // Save Mappings
  document.getElementById('savePrintersBtn').addEventListener('click', async () => {
    currentConfig.bwPrinter = document.getElementById('bwPrinterSelect').value;
    currentConfig.colorPrinter = document.getElementById('colorPrinterSelect').value;
    await window.electronAPI.saveConfig(currentConfig);
    showNotice('Printer Mappings Saved!');
  });

  // Save Settings
  document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    currentConfig.backendUrl = document.getElementById('settingBackendUrl').value.trim() || 'http://localhost:8000';
    await window.electronAPI.saveConfig(currentConfig);
    showNotice('Settings Saved! Reconnecting...');
    await connectToBackend();
  });

  // Photo Proof Close
  document.getElementById('closePhotoProofBtn').addEventListener('click', () => {
    document.getElementById('photoProofModal').classList.add('hidden');
  });
}

function updateToggleUI() {
  const toggleDot = document.getElementById('toggleDot');
  const statusText = document.getElementById('autoPrintStatusText');
  const isChecked = currentConfig.autoPrint;

  document.getElementById('autoPrintToggle').checked = isChecked;
  if (isChecked) {
    toggleDot.classList.add('translate-x-5', 'bg-emerald-400');
    toggleDot.classList.remove('bg-slate-400');
    statusText.innerText = '⚡ ON (Auto-Spooling)';
    statusText.classList.add('text-emerald-400', 'font-bold');
    statusText.classList.remove('text-slate-400');
  } else {
    toggleDot.classList.remove('translate-x-5', 'bg-emerald-400');
    toggleDot.classList.add('bg-slate-400');
    statusText.innerText = 'OFF (Manual Click)';
    statusText.classList.remove('text-emerald-400', 'font-bold');
    statusText.classList.add('text-slate-400');
  }
}

// Load Application Config
async function loadAppConfig() {
  const cfg = await window.electronAPI.getConfig();
  currentConfig = { ...currentConfig, ...cfg };
  document.getElementById('settingBackendUrl').value = currentConfig.backendUrl;
  updateToggleUI();
}

// Load Physical Printers from Windows Spooler
async function loadPrinters() {
  const res = await window.electronAPI.getSystemPrinters();
  const bwSelect = document.getElementById('bwPrinterSelect');
  const colorSelect = document.getElementById('colorPrinterSelect');

  bwSelect.innerHTML = '<option value="">-- Select Windows Printer --</option>';
  colorSelect.innerHTML = '<option value="">-- Select Windows Printer --</option>';

  if (res.success && res.printers.length > 0) {
    res.printers.forEach((p) => {
      const isPhys = p.isPhysical ? '🖨️ ' : '📄 ';
      const opt1 = new Option(`${isPhys}${p.name}`, p.name);
      const opt2 = new Option(`${isPhys}${p.name}`, p.name);

      if (p.name === currentConfig.bwPrinter || (!currentConfig.bwPrinter && p.isPhysical)) {
        opt1.selected = true;
        currentConfig.bwPrinter = p.name;
      }
      if (p.name === currentConfig.colorPrinter || (!currentConfig.colorPrinter && p.isPhysical)) {
        opt2.selected = true;
        currentConfig.colorPrinter = p.name;
      }

      bwSelect.add(opt1);
      colorSelect.add(opt2);
    });
  } else {
    bwSelect.innerHTML = '<option value="">No Windows Printers Detected</option>';
    colorSelect.innerHTML = '<option value="">No Windows Printers Detected</option>';
  }
}

// Connect to Backend API
async function connectToBackend() {
  const dot = document.getElementById('backendDot');
  const status = document.getElementById('backendStatusText');

  try {
    status.innerText = 'Connecting...';
    dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';

    // 1. Authenticate Shop User
    const email = document.getElementById('settingShopEmail').value || 'shop@printhub.com';
    const password = document.getElementById('settingShopPassword').value || 'password123';

    const loginRes = await fetch(`${currentConfig.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) {
      throw new Error(loginData.message || 'Login failed');
    }

    currentConfig.token = loginData.token;
    currentConfig.shopUser = loginData.user;
    document.getElementById('shopNameSub').innerText = `${loginData.user.shop?.name || 'My Print Shop'} • ${currentConfig.backendUrl}`;

    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-ring';
    status.innerText = 'Online (Live SSE)';

    // 2. Fetch Queue and Subscribe to SSE
    await fetchQueue();
    startSSEStream();
  } catch (err) {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    status.innerText = 'Disconnected';
    document.getElementById('shopNameSub').innerText = `Could not connect to ${currentConfig.backendUrl} (${err.message})`;
  }
}

// Real-Time Server-Sent Events (SSE) Stream
function startSSEStream() {
  if (sseConnection) sseConnection.close();

  const url = `${currentConfig.backendUrl}/api/sse/subscribe?token=${currentConfig.token}`;
  sseConnection = new EventSource(url);

  sseConnection.addEventListener('new_order', async (event) => {
    const data = JSON.parse(event.data);
    triggerAudioChime();
    showNotice(`🔔 New Order #${data.orderNumber} received!`);
    await fetchQueue();

    // Auto-Print Execution
    if (currentConfig.autoPrint) {
      autoPrintLatestOrder(data.orderId);
    }
  });

  sseConnection.addEventListener('queue_updated', () => {
    fetchQueue();
  });

  sseConnection.onerror = () => {
    // Reconnect in 5 seconds
    setTimeout(startSSEStream, 5000);
  };
}

function triggerAudioChime() {
  if (currentConfig.soundAlerts) {
    const audio = document.getElementById('orderChimeAudio');
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

// Fetch Orders Queue
async function fetchQueue() {
  try {
    const res = await fetch(`${currentConfig.backendUrl}/api/orders/shop/queue`, {
      headers: { Authorization: `Bearer ${currentConfig.token}` }
    });
    const data = await res.json();
    if (data.success) {
      queueOrders = data.queue || [];
      historyOrders = data.history || [];
      renderQueueUI();
      renderHistoryUI();
    }
  } catch (err) {
    console.error('Error fetching queue:', err);
  }
}

// Render Queue Cards
function renderQueueUI() {
  const container = document.getElementById('ordersContainer');
  const emptyState = document.getElementById('queueEmptyState');
  const badge = document.getElementById('queueBadge');

  badge.innerText = queueOrders.length;

  if (queueOrders.length === 0) {
    emptyState.classList.remove('hidden');
    container.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  container.classList.remove('hidden');

  container.innerHTML = queueOrders.map((order, orderIdx) => {
    const allPrinted = order.items.every((i) => i.status === 'PRINTED');

    return `
      <div class="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm hover:border-slate-700 transition">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-xl bg-indigo-950 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center border border-indigo-800">
              #${orderIdx + 1}
            </span>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-white text-sm">#${order.orderNumber}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  ${order.status}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                ${order.customer?.name || 'Customer'} • ${order.customer?.phone || ''}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="font-mono font-black text-indigo-400 text-sm">₹${order.totalAmount.toFixed(2)}</span>
            ${order.paymentScreenshot ? `
              <button onclick="viewPhotoProof('${order.paymentScreenshot}')" class="px-2.5 py-1 rounded-xl bg-purple-950 text-purple-300 border border-purple-800 text-[11px] font-bold hover:bg-purple-900 transition">
                📸 Proof
              </button>
            ` : ''}
          </div>
        </div>

        <div class="space-y-2">
          ${order.items.map((item) => {
            const isPrinted = item.status === 'PRINTED';
            const duplexLabel = item.duplexMode === 'DUPLEX_SHORT' ? 'Duplex (Short Edge)' : (item.duplexMode === 'DUPLEX_LONG' || item.duplexMode === 'DUPLEX') ? 'Duplex (Long Edge)' : '1-Sided';
            const subsetLabel = item.pageSubset && item.pageSubset !== 'ALL' ? ` • ${item.pageSubset === 'ODD' ? 'Odd Pgs' : 'Even Pgs'}` : '';

            return `
              <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-xs font-bold text-white truncate">${item.originalFileName}</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    <span class="text-indigo-300 font-semibold">${item.colorMode === 'COLOR' ? '🎨 Color' : '⬛ B&W'}</span>
                    <span>•</span>
                    <span>${duplexLabel}</span>
                    <span>•</span>
                    <span>${item.paperSize}</span>
                    <span>•</span>
                    <span>${item.calculatedPages} pgs × ${item.copies} ${item.copies === 1 ? 'copy' : 'copies'}${subsetLabel}</span>
                  </p>
                </div>

                <div>
                  ${isPrinted ? `
                    <span class="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1">
                      ✓ Printed
                    </span>
                  ` : `
                    <button onclick="printOrderItem('${order.id}', '${item.id}')" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95">
                      <span>🖨️ Print Now</span>
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${allPrinted ? `
          <div class="pt-2 text-right">
            <button onclick="markReadyForPickup('${order.id}')" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition">
              ✓ Mark Ready for Pickup
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Render Completed History
function renderHistoryUI() {
  const tbody = document.getElementById('historyTableBody');
  if (historyOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-slate-500">No completed orders yet</td></tr>';
    return;
  }

  tbody.innerHTML = historyOrders.map((o) => `
    <tr class="hover:bg-slate-800/30 transition">
      <td class="py-3 font-mono font-bold text-white">#${o.orderNumber}</td>
      <td class="py-3">${o.customer?.name || 'Customer'}</td>
      <td class="py-3">${o.items.length} ${o.items.length === 1 ? 'doc' : 'docs'}</td>
      <td class="py-3 font-mono font-semibold text-indigo-400">₹${o.totalAmount.toFixed(2)}</td>
      <td class="py-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">${o.status}</span></td>
      <td class="py-3 text-slate-400">${new Date(o.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
    </tr>
  `).join('');
}

// Print Order Item
window.printOrderItem = async (orderId, itemId) => {
  const order = queueOrders.find((o) => o.id === orderId);
  if (!order) return;
  const item = order.items.find((i) => i.id === itemId);
  if (!item) return;

  const targetPrinter = item.colorMode === 'COLOR' ? currentConfig.colorPrinter : currentConfig.bwPrinter;
  const fileUrl = `${currentConfig.backendUrl}/uploads/raw/${item.storedFileName}`;

  showNotice(`Dispatching '${item.originalFileName}' to ${targetPrinter || 'Default Printer'}...`);

  const printRes = await window.electronAPI.printJob({
    orderNumber: order.orderNumber,
    originalFileName: item.originalFileName,
    fileUrl,
    printerName: targetPrinter,
    colorMode: item.colorMode,
    duplexMode: item.duplexMode,
    paperSize: item.paperSize,
    copies: item.copies,
    pageRange: item.pageRange,
    pageSubset: item.pageSubset,
    scaling: item.scaling,
    orientation: item.orientation
  });

  if (printRes.success) {
    showNotice(printRes.message || 'Job spooled successfully!');

    // Notify backend
    await fetch(`${currentConfig.backendUrl}/api/orders/${orderId}/items/${itemId}/print`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentConfig.token}` }
    });

    await fetchQueue();
  } else {
    alert(`Print Error: ${printRes.message}`);
  }
};

// Auto Print Order
async function autoPrintLatestOrder(orderId) {
  const order = queueOrders.find((o) => o.id === orderId);
  if (!order) return;

  for (const item of order.items) {
    if (item.status !== 'PRINTED') {
      await window.printOrderItem(order.id, item.id);
    }
  }
}

// Mark Ready for Pickup
window.markReadyForPickup = async (orderId) => {
  await fetch(`${currentConfig.backendUrl}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentConfig.token}`
    },
    body: JSON.stringify({ status: 'PRINTED' })
  });
  showNotice('Order marked Ready for Pickup!');
  await fetchQueue();
};

// View Photo Proof
window.viewPhotoProof = (url) => {
  document.getElementById('modalProofImg').src = url;
  document.getElementById('photoProofModal').classList.remove('hidden');
};

// Simple In-App Notice
function showNotice(msg) {
  const notice = document.createElement('div');
  notice.className = 'fixed bottom-5 right-5 bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xl border border-indigo-400 animate-bounce z-50';
  notice.innerText = msg;
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 4000);
}
