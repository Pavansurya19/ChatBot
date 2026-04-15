// ══════════════════════════════════════════════════════════════════
// ERAYAA BUILDERS — WhatsApp Brochure Bot  (v2 — Premium Dashboard)
// ══════════════════════════════════════════════════════════════════

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import express from 'express';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { BROCHURES, WELCOME_MESSAGE } from './brochures.js';

// ── Express server ─────────────────────────────────────────────────
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const stats = {
  totalMessages: 0,
  brochuresSent: 0,
  lastMessage: null,
  startTime: new Date(),
  projectHits: {}          // { "eilv": 5, "egw": 3, ... }
};
let botReady = false;
let botConnecting = false;
let currentQRDataUrl = null;
let currentSock = null;

// ── Build numbered menu ────────────────────────────────────────────
const PROJECT_MENU = {};
const ALL_PROJECTS = Object.values(BROCHURES);
ALL_PROJECTS.forEach((p, i) => { PROJECT_MENU[String(i + 1)] = p; });

function buildMenuText() {
  return (
    `🏘️ *Erayaa Builders & Developers*\n` +
    `_Premium Real Estate, Bengaluru_\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Select a project by replying with its *number*:\n\n` +
    ALL_PROJECTS.map((p, i) =>
      `${i + 1}️⃣ *${p.name}*\n    📍 ${p.location} | 🏷️ ${p.type}`
    ).join('\n\n') +
    `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
    `👉 *VISIT* — Book a free site visit\n` +
    `👉 *CALL* — Request a callback`
  );
}
const MENU_TEXT = buildMenuText();

// ── Uptime helper ──────────────────────────────────────────────────
function formatUptime() {
  const ms = Date.now() - stats.startTime.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Top-project helper ─────────────────────────────────────────────
function topProjects() {
  return Object.entries(stats.projectHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const proj = Object.values(BROCHURES).find(p => p.key === key);
      return { name: proj ? proj.name : key, count };
    });
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD HTML
// ══════════════════════════════════════════════════════════════════
function dashboardHTML() {
  const statusColor = botReady ? '#22c55e' : '#f59e0b';
  const statusText  = botReady ? 'Online & Running' : (botConnecting ? 'Connecting…' : 'Offline');
  const statusDot   = botReady ? 'dot-green' : 'dot-amber';

  const projectRows = ALL_PROJECTS.map((p, i) => `
    <tr>
      <td class="td-num">${i + 1}</td>
      <td><span class="proj-name">${p.name}</span></td>
      <td><span class="badge badge-type">${p.type}</span></td>
      <td class="td-loc">${p.location}</td>
      <td class="td-price">${p.price}</td>
      <td><span class="badge badge-hits">${stats.projectHits[p.key] || 0}</span></td>
    </tr>`).join('');

  const topRows = topProjects().map(t => `
    <div class="top-row">
      <span class="top-name">${t.name}</span>
      <span class="top-count">${t.count} sent</span>
    </div>`).join('') || `<div class="top-empty">No brochures sent yet</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="refresh" content="30"/>
<title>Erayaa Bot Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
  :root {
    --gold:      #b8860b;
    --gold-lt:   #d4a017;
    --gold-pale: #fdf6e3;
    --dark:      #1a1209;
    --card-bg:   #fffdf7;
    --border:    #e8d9b0;
    --text:      #2d2010;
    --muted:     #8a7555;
    --green:     #16a34a;
    --amber:     #d97706;
    --red:       #dc2626;
    --shadow:    0 4px 24px rgba(184,134,11,.12);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: #f5edd8 url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23b8860b' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    color: var(--text);
    min-height: 100vh;
  }

  /* ── Header ── */
  header {
    background: linear-gradient(135deg, #1a1209 0%, #2d1f08 60%, #3d2c0a 100%);
    padding: 28px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid var(--gold);
    box-shadow: 0 6px 32px rgba(0,0,0,.35);
    position: sticky; top: 0; z-index: 100;
  }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .logo-icon { font-size: 2.4rem; }
  .brand-title {
    font-family: 'Playfair Display', serif;
    color: var(--gold-lt);
    font-size: 1.55rem;
    letter-spacing: .5px;
  }
  .brand-sub { color: #a08040; font-size: .8rem; margin-top: 2px; letter-spacing: 1px; text-transform: uppercase; }
  .header-right { display: flex; align-items: center; gap: 14px; }
  .status-pill {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,.07);
    border: 1px solid rgba(184,134,11,.3);
    border-radius: 100px;
    padding: 8px 18px;
    font-size: .85rem; font-weight: 600;
    color: ${statusColor};
  }
  .dot {
    width: 9px; height: 9px; border-radius: 50%;
  }
  .dot-green { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.25); animation: pulse-g 2s infinite; }
  .dot-amber { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,.25); animation: pulse-a 2s infinite; }
  @keyframes pulse-g { 0%,100% { box-shadow: 0 0 0 3px rgba(34,197,94,.25); } 50% { box-shadow: 0 0 0 7px rgba(34,197,94,.08); } }
  @keyframes pulse-a { 0%,100% { box-shadow: 0 0 0 3px rgba(245,158,11,.25); } 50% { box-shadow: 0 0 0 7px rgba(245,158,11,.08); } }
  .btn {
    cursor: pointer; border: none; border-radius: 8px;
    padding: 9px 20px; font-family: 'DM Sans', sans-serif;
    font-size: .85rem; font-weight: 600; transition: all .18s;
  }
  .btn-qr { background: var(--gold); color: #fff; }
  .btn-qr:hover { background: var(--gold-lt); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(184,134,11,.4); }
  .btn-danger { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
  .btn-danger:hover { background: #dc2626; color: #fff; }
  .btn-sm { padding: 6px 14px; font-size: .78rem; }

  /* ── Main layout ── */
  main { max-width: 1300px; margin: 0 auto; padding: 36px 32px 60px; }

  /* ── KPI cards ── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 18px;
    margin-bottom: 36px;
  }
  .kpi-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px 22px;
    box-shadow: var(--shadow);
    display: flex; flex-direction: column; gap: 8px;
    transition: transform .18s, box-shadow .18s;
    position: relative; overflow: hidden;
  }
  .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(184,134,11,.18); }
  .kpi-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
  }
  .kpi-card.kpi-gold::before  { background: linear-gradient(90deg, var(--gold), var(--gold-lt)); }
  .kpi-card.kpi-green::before { background: linear-gradient(90deg, #16a34a, #22c55e); }
  .kpi-card.kpi-blue::before  { background: linear-gradient(90deg, #2563eb, #60a5fa); }
  .kpi-card.kpi-purple::before{ background: linear-gradient(90deg, #7c3aed, #a78bfa); }
  .kpi-card.kpi-rose::before  { background: linear-gradient(90deg, #e11d48, #fb7185); }
  .kpi-icon { font-size: 1.6rem; }
  .kpi-label { font-size: .72rem; text-transform: uppercase; letter-spacing: 1.2px; color: var(--muted); font-weight: 600; }
  .kpi-value { font-size: 2rem; font-weight: 700; color: var(--dark); line-height: 1; }
  .kpi-sub { font-size: .75rem; color: var(--muted); }

  /* ── 2-col grid ── */
  .two-col { display: grid; grid-template-columns: 1fr 340px; gap: 24px; margin-bottom: 24px; }
  @media(max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

  /* ── Section card ── */
  .section-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  .section-head {
    background: linear-gradient(90deg, #1a1209, #2d1f08);
    padding: 16px 24px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .section-title {
    font-family: 'Playfair Display', serif;
    color: var(--gold-lt); font-size: 1rem; font-weight: 600;
  }
  .section-body { padding: 20px 24px; }

  /* ── Projects table ── */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; padding: 10px 12px;
    font-size: .72rem; text-transform: uppercase; letter-spacing: 1px;
    color: var(--muted); border-bottom: 2px solid var(--border);
  }
  td { padding: 12px 12px; border-bottom: 1px solid #f0e8d0; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #fdf8ed; }
  .td-num { color: var(--muted); font-size: .85rem; width: 32px; }
  .td-loc { color: var(--muted); font-size: .82rem; }
  .td-price { font-weight: 600; color: var(--gold); font-size: .85rem; }
  .proj-name { font-weight: 600; font-size: .9rem; }
  .badge {
    display: inline-block; border-radius: 100px;
    padding: 3px 10px; font-size: .72rem; font-weight: 600;
  }
  .badge-type { background: #fef3c7; color: #92400e; }
  .badge-hits { background: #d1fae5; color: #065f46; min-width: 28px; text-align: center; }

  /* ── Top projects panel ── */
  .top-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 11px 0; border-bottom: 1px solid #f0e8d0;
  }
  .top-row:last-child { border-bottom: none; }
  .top-name { font-size: .875rem; font-weight: 500; }
  .top-count { background: var(--gold-pale); color: var(--gold); font-size: .75rem;
                font-weight: 700; padding: 3px 10px; border-radius: 100px; border: 1px solid #e8d09a; }
  .top-empty { color: var(--muted); font-size: .85rem; padding: 12px 0; text-align: center; }

  /* ── Device panel ── */
  .device-status {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px; border-radius: 10px;
    margin-bottom: 16px;
    background: ${botReady ? '#f0fdf4' : '#fffbeb'};
    border: 1px solid ${botReady ? '#bbf7d0' : '#fde68a'};
  }
  .device-icon { font-size: 1.4rem; }
  .device-label { font-size: .85rem; font-weight: 600; color: ${statusColor}; }
  .device-sub { font-size: .75rem; color: var(--muted); }
  .btn-group { display: flex; flex-direction: column; gap: 10px; }

  /* ── QR modal ── */
  #qr-modal {
    display: none; position: fixed; inset: 0; z-index: 999;
    background: rgba(26,18,9,.7); backdrop-filter: blur(4px);
    align-items: center; justify-content: center;
  }
  #qr-modal.open { display: flex; }
  .modal-box {
    background: var(--card-bg); border: 2px solid var(--gold);
    border-radius: 20px; padding: 36px; text-align: center;
    max-width: 380px; width: 90%;
    box-shadow: 0 24px 80px rgba(0,0,0,.4);
    animation: modal-in .25s ease;
  }
  @keyframes modal-in { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
  .modal-title {
    font-family: 'Playfair Display', serif;
    color: var(--gold); font-size: 1.3rem; margin-bottom: 8px;
  }
  .modal-sub { color: var(--muted); font-size: .82rem; margin-bottom: 20px; line-height: 1.6; }
  #qr-image { width: 240px; height: 240px; border: 3px solid var(--gold); border-radius: 12px; object-fit: contain; }
  #qr-waiting { padding: 60px 20px; color: var(--muted); }
  .spinner {
    width: 36px; height: 36px; border: 3px solid var(--border);
    border-top-color: var(--gold); border-radius: 50%;
    animation: spin 1s linear infinite; margin: 0 auto 12px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .modal-close { margin-top: 18px; }

  /* ── Toast ── */
  #toast {
    position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
    background: #1a1209; color: #fff; padding: 12px 24px;
    border-radius: 100px; font-size: .85rem; font-weight: 500;
    opacity: 0; transition: opacity .3s; pointer-events: none; z-index: 9999;
    box-shadow: 0 8px 24px rgba(0,0,0,.3);
  }
  #toast.show { opacity: 1; }

  /* ── Footer ── */
  footer {
    text-align: center; color: var(--muted); font-size: .78rem;
    padding: 24px; border-top: 1px solid var(--border);
    margin-top: 12px;
  }

  /* ── Confirm dialog ── */
  #confirm-modal {
    display: none; position: fixed; inset: 0; z-index: 1000;
    background: rgba(26,18,9,.7); backdrop-filter: blur(4px);
    align-items: center; justify-content: center;
  }
  #confirm-modal.open { display: flex; }
  .confirm-box {
    background: var(--card-bg); border: 2px solid #fca5a5;
    border-radius: 16px; padding: 28px 32px; text-align: center;
    max-width: 340px; width: 90%;
    animation: modal-in .25s ease;
  }
  .confirm-icon { font-size: 2.4rem; margin-bottom: 10px; }
  .confirm-title { font-family: 'Playfair Display', serif; font-size: 1.15rem; color: #dc2626; margin-bottom: 8px; }
  .confirm-msg { font-size: .84rem; color: var(--muted); line-height: 1.6; margin-bottom: 20px; }
  .confirm-btns { display: flex; gap: 10px; justify-content: center; }
  .btn-cancel { background: #f5edd8; color: var(--muted); }
  .btn-cancel:hover { background: #e8d9b0; }
</style>
</head>
<body>

<!-- ── Header ── -->
<header>
  <div class="header-left">
    <span class="logo-icon">🏠</span>
    <div>
      <div class="brand-title">Erayaa WhatsApp Bot</div>
      <div class="brand-sub">Builders &amp; Developers · Bengaluru</div>
    </div>
  </div>
  <div class="header-right">
    <div class="status-pill">
      <span class="dot ${statusDot}"></span>
      ${statusText}
    </div>
    ${!botReady ? `<button class="btn btn-qr" onclick="openQR()">📱 Scan QR</button>` : ''}
  </div>
</header>

<main>
  <!-- ── KPI Cards ── -->
  <div class="kpi-grid">
    <div class="kpi-card kpi-gold">
      <span class="kpi-icon">💬</span>
      <span class="kpi-label">Total Messages</span>
      <span class="kpi-value">${stats.totalMessages}</span>
      <span class="kpi-sub">Since bot started</span>
    </div>
    <div class="kpi-card kpi-green">
      <span class="kpi-icon">📄</span>
      <span class="kpi-label">Brochures Sent</span>
      <span class="kpi-value">${stats.brochuresSent}</span>
      <span class="kpi-sub">Auto-delivered</span>
    </div>
    <div class="kpi-card kpi-blue">
      <span class="kpi-icon">🏗️</span>
      <span class="kpi-label">Active Projects</span>
      <span class="kpi-value">${ALL_PROJECTS.length}</span>
      <span class="kpi-sub">In portfolio</span>
    </div>
    <div class="kpi-card kpi-purple">
      <span class="kpi-icon">⏱️</span>
      <span class="kpi-label">Uptime</span>
      <span class="kpi-value">${formatUptime()}</span>
      <span class="kpi-sub">Current session</span>
    </div>
    <div class="kpi-card kpi-rose">
      <span class="kpi-icon">🕐</span>
      <span class="kpi-label">Last Activity</span>
      <span class="kpi-value" style="font-size:1rem;padding-top:6px;">${stats.lastMessage || '—'}</span>
      <span class="kpi-sub">Most recent message</span>
    </div>
  </div>

  <!-- ── Two-column: Projects table + Right panel ── -->
  <div class="two-col">

    <!-- Projects table -->
    <div class="section-card">
      <div class="section-head">
        <span class="section-title">🏘️ Active Project Portfolio</span>
        <span style="color:#6b5120;font-size:.75rem;">${ALL_PROJECTS.length} projects</span>
      </div>
      <div class="section-body">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Project</th>
                <th>Type</th>
                <th>Location</th>
                <th>Price</th>
                <th>Hits</th>
              </tr>
            </thead>
            <tbody>${projectRows}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Right panel -->
    <div style="display:flex;flex-direction:column;gap:20px;">

      <!-- Device management -->
      <div class="section-card">
        <div class="section-head">
          <span class="section-title">📱 Device Management</span>
        </div>
        <div class="section-body">
          <div class="device-status">
            <span class="device-icon">${botReady ? '✅' : '⚠️'}</span>
            <div>
              <div class="device-label">${statusText}</div>
              <div class="device-sub">WhatsApp connection</div>
            </div>
          </div>
          <div class="btn-group">
            ${!botReady ? `
            <button class="btn btn-qr" onclick="openQR()" style="width:100%;padding:12px;">
              📱 Scan QR Code to Connect
            </button>` : ''}
            <button class="btn btn-danger" style="width:100%;padding:12px;" onclick="confirmDisconnect()">
              🔌 Disconnect &amp; Remove Device
            </button>
            <button class="btn" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;width:100%;padding:10px;" onclick="refreshPage()">
              🔄 Refresh Status
            </button>
          </div>
        </div>
      </div>

      <!-- Top projects -->
      <div class="section-card">
        <div class="section-head">
          <span class="section-title">🔥 Top Requested Projects</span>
        </div>
        <div class="section-body">
          ${topRows}
        </div>
      </div>

      <!-- Quick commands -->
      <div class="section-card">
        <div class="section-head">
          <span class="section-title">💡 Bot Commands</span>
        </div>
        <div class="section-body" style="font-size:.82rem;line-height:2;">
          <div><code style="background:#f5edd8;padding:2px 8px;border-radius:4px;">MENU</code> — Show all projects</div>
          <div><code style="background:#f5edd8;padding:2px 8px;border-radius:4px;">VISIT</code> — Book site visit</div>
          <div><code style="background:#f5edd8;padding:2px 8px;border-radius:4px;">CALL</code> — Request callback</div>
          <div><code style="background:#f5edd8;padding:2px 8px;border-radius:4px;">1–${ALL_PROJECTS.length}</code> — Get project brochure</div>
          <div style="margin-top:8px;color:var(--muted);">Customer can also type any project name directly.</div>
        </div>
      </div>

    </div>
  </div>

</main>

<footer>
  Erayaa Builders &amp; Developers · Bengaluru &nbsp;|&nbsp;
  Auto-refreshes every 30s &nbsp;|&nbsp;
  📞 Muniraj: +91 63648 74166 &nbsp;·&nbsp; Jayaraj: +91 99454 23048
</footer>

<!-- ── QR Modal ── -->
<div id="qr-modal">
  <div class="modal-box">
    <div class="modal-title">📱 Connect WhatsApp</div>
    <div class="modal-sub">
      Open WhatsApp → <strong>Settings → Linked Devices → Link a Device</strong><br/>
      Then scan this QR code. It refreshes every 20 seconds.
    </div>
    ${currentQRDataUrl
      ? `<img id="qr-image" src="${currentQRDataUrl}" alt="QR Code"/>`
      : `<div id="qr-waiting"><div class="spinner"></div><p>Generating QR code…<br>Check back in a few seconds.</p></div>`
    }
    <div class="modal-close">
      <button class="btn btn-cancel btn-sm" onclick="closeQR()">✕ Close</button>
    </div>
  </div>
</div>

<!-- ── Confirm disconnect modal ── -->
<div id="confirm-modal">
  <div class="confirm-box">
    <div class="confirm-icon">⚠️</div>
    <div class="confirm-title">Disconnect Device?</div>
    <div class="confirm-msg">
      This will remove the linked WhatsApp account and delete the session.<br/>
      You will need to scan a new QR code to reconnect.
    </div>
    <div class="confirm-btns">
      <button class="btn btn-cancel" onclick="closeConfirm()">Cancel</button>
      <button class="btn btn-danger" onclick="doDisconnect()">Yes, Disconnect</button>
    </div>
  </div>
</div>

<!-- ── Toast ── -->
<div id="toast"></div>

<script>
  function openQR()    { document.getElementById('qr-modal').classList.add('open'); }
  function closeQR()   { document.getElementById('qr-modal').classList.remove('open'); }
  function confirmDisconnect() { document.getElementById('confirm-modal').classList.add('open'); }
  function closeConfirm()      { document.getElementById('confirm-modal').classList.remove('open'); }
  function refreshPage()       { location.reload(); }

  function showToast(msg, ok = true) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.background = ok ? '#1a1209' : '#dc2626';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }

  async function doDisconnect() {
    closeConfirm();
    try {
      const r = await fetch('/api/disconnect', { method: 'POST' });
      const d = await r.json();
      showToast(d.message || 'Device disconnected!', true);
      setTimeout(() => location.reload(), 2000);
    } catch(e) {
      showToast('Error: ' + e.message, false);
    }
  }

  // Close modals on backdrop click
  document.getElementById('qr-modal').addEventListener('click', function(e) {
    if (e.target === this) closeQR();
  });
  document.getElementById('confirm-modal').addEventListener('click', function(e) {
    if (e.target === this) closeConfirm();
  });
</script>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════
// EXPRESS ROUTES
// ══════════════════════════════════════════════════════════════════
app.get('/', (_, res) => res.send(dashboardHTML()));

app.get('/qr', (_, res) => {
  if (botReady) return res.send(`<html><body style="padding:40px;text-align:center;font-family:sans-serif;"><h2 style="color:green;">✅ Bot already connected!</h2><a href="/">← Dashboard</a></body></html>`);
  if (currentQRDataUrl) return res.send(`
    <html><head><title>Scan QR</title><meta http-equiv="refresh" content="20"></head>
    <body style="font-family:sans-serif;padding:40px;text-align:center;background:#f8f6f1;">
      <h2 style="color:#8B6914;">📱 Scan with WhatsApp</h2>
      <img src="${currentQRDataUrl}" style="width:300px;height:300px;border:4px solid #8B6914;border-radius:12px;"/>
      <p>WhatsApp → <strong>Settings → Linked Devices → Link a Device</strong></p>
      <p style="color:#e07b00;font-size:13px;">⏰ Auto-refreshes every 20s for new QR</p>
      <a href="/">← Dashboard</a>
    </body></html>`);
  return res.send(`<html><head><meta http-equiv="refresh" content="4"></head><body style="padding:40px;text-align:center;"><h2>⏳ QR loading... (auto-refreshes)</h2><a href="/">← Dashboard</a></body></html>`);
});

// JSON API — status
app.get('/api/status', (_, res) => res.json({
  online: botReady,
  connecting: botConnecting,
  stats,
  uptime: formatUptime(),
  projects: ALL_PROJECTS.length
}));

// JSON API — disconnect + clear session
app.post('/api/disconnect', async (_, res) => {
  try {
    if (currentSock) {
      try { await currentSock.logout(); } catch (_) {}
    }
    botReady = false;
    currentQRDataUrl = null;

    // Delete auth session folder so QR is required on next start
    const AUTH_FOLDER = './auth_info';
    if (fs.existsSync(AUTH_FOLDER)) {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    }
    res.json({ ok: true, message: '✅ Device disconnected. Session cleared. Restart the bot to scan a new QR code.' });

    // Restart bot after 2s so new QR appears
    setTimeout(() => {
      startBot().catch(err => console.error('Restart error:', err));
    }, 2000);
  } catch (err) {
    res.json({ ok: false, message: 'Error: ' + err.message });
  }
});

app.get('/ping', (_, res) => res.send('pong'));
app.listen(PORT, () => console.log(`✅ Web server on port ${PORT}`));

const logger = pino({ level: 'silent' });
const AUTH_FOLDER = './auth_info';

// ── Sessions ───────────────────────────────────────────────────────
const sessions = {};
function getSession(jid) {
  if (!sessions[jid]) sessions[jid] = { state: 'new' };
  return sessions[jid];
}

// ══════════════════════════════════════════════════════════════════
// START BOT
// ══════════════════════════════════════════════════════════════════
async function startBot() {
  botConnecting = true;
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();
  console.log(`\n🚀 Starting Erayaa Bot (Baileys v${version.join('.')})`);

  const sock = makeWASocket({
    version, auth: state, logger,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  });

  currentSock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      try {
        currentQRDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        console.log('\n📱 QR ready! Visit your URL to scan.');
      } catch (e) { console.error('QR error:', e); }
    }
    if (connection === 'open') {
      botReady = true; botConnecting = false; currentQRDataUrl = null;
      console.log('\n✅ Erayaa WhatsApp Bot is LIVE!\n');
    }
    if (connection === 'close') {
      botReady = false; botConnecting = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reconnect  = statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️  Disconnected:', lastDisconnect?.error?.message || 'Unknown');
      if (reconnect) {
        console.log('🔄 Reconnecting in 5s...');
        setTimeout(startBot, 5000);
      } else {
        console.log('❌ Logged out. Session cleared — awaiting new QR scan.');
      }
    }
  });

  // ══════════════════════════════════════════════════════════════
  // MESSAGE HANDLER
  // ══════════════════════════════════════════════════════════════
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;
      if (msg.key.remoteJid.endsWith('@g.us')) continue;

      const from  = msg.key.remoteJid;
      const body  = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption || ''
      ).trim();

      if (!body) continue;

      const lower   = body.toLowerCase();
      const session = getSession(from);
      stats.totalMessages++;
      stats.lastMessage = new Date().toLocaleString('en-IN');
      console.log(`\n📩 [${from}]: "${body.slice(0, 100)}"`);

      const send = (text) => sock.sendMessage(from, { text }, { quoted: msg });

      // ── VISIT ───────────────────────────────────────────────
      if (lower === 'visit' || lower.includes('site visit') || lower.includes('book visit')) {
        await send(
          `🗓️ *Book a Free Site Visit*\n\n` +
          `Our property advisor will contact you shortly!\n\n` +
          `📞 Muniraj (GM): +91 63648 74166\n` +
          `📞 Jayaraj (RM): +91 99454 23048\n\n` +
          `🌐 https://erayaa.in`
        );
        continue;
      }

      // ── CALL ────────────────────────────────────────────────
      if (lower === 'call' || lower.includes('callback') || lower.includes('call me')) {
        await send(
          `📞 *Request a Callback*\n\nOur team calls within 30 minutes (9AM–7PM).\n\n` +
          `📞 Muniraj (GM): +91 63648 74166\n` +
          `📞 Jayaraj (RM): +91 99454 23048`
        );
        continue;
      }

      // ── MENU / PROJECTS ─────────────────────────────────────
      if (lower === 'menu' || lower === 'projects' || lower.includes('all projects')) {
        session.state = 'menu';
        await send(MENU_TEXT);
        continue;
      }

      // ── Website brochure request ─────────────────────────────
      if (lower.includes('interested in') || (lower.includes('brochure') && lower.includes('erayaa'))) {
        let projectName = null;

        const p1 = body.match(/interested in \*([^*\n]+)\*/i);
        if (p1) projectName = p1[1].trim();

        if (!projectName) {
          const p2 = body.match(/interested in ([^\n]+?)(?:\s+and\s|\s*\n|$)/i);
          if (p2) projectName = p2[1].trim();
        }

        if (!projectName) {
          const p3 = body.match(/Erayaa\s+[A-Za-z\s]+/i);
          if (p3) projectName = p3[0].trim();
        }

        const nameMatch     = body.match(/(?:\*?Name:?\*?)\s*([^\n*]+)/i);
        const customerName  = nameMatch?.[1]?.trim() || '';
        const phoneMatch    = body.match(/(?:\*?Phone:?\*?)\s*([^\n*]+)/i);
        const customerPhone = phoneMatch?.[1]?.trim() || '';

        console.log(`   👤 Name: "${customerName}" | 📞 "${customerPhone}" | 🏠 "${projectName}"`);

        const project = projectName ? findProject(projectName) : null;

        if (project) {
          await sendBrochure(send, project, customerName);
        } else {
          session.state = 'menu';
          const greeting = customerName ? `👋 *Hi ${customerName}!*` : `👋 *Hi!*`;
          await send(`${greeting} Welcome to Erayaa Builders & Developers!\n\nPlease select the project you're interested in:\n\n${MENU_TEXT}`);
        }
        continue;
      }

      // ── Menu number selection ────────────────────────────────
      if (session.state === 'menu') {
        const picked = PROJECT_MENU[body.trim()];
        if (picked) {
          session.state = 'done';
          await sendBrochure(send, picked, '');
        } else {
          await send(`❌ Please reply with a *number* from the list:\n\n${MENU_TEXT}`);
        }
        continue;
      }

      // ── Greeting ─────────────────────────────────────────────
      if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') ||
          lower.includes('namaste') || lower.length < 15) {
        session.state = 'menu';
        await send(`👋 *Hi! Welcome to Erayaa Builders & Developers!*\n\n${MENU_TEXT}`);
        continue;
      }

      // ── Direct project name ──────────────────────────────────
      const directMatch = findProject(body);
      if (directMatch) {
        await sendBrochure(send, directMatch, '');
        continue;
      }

      // ── Fallback ─────────────────────────────────────────────
      session.state = 'menu';
      await send(`🏠 *Erayaa Builders & Developers*\n\nHere are our projects:\n\n${MENU_TEXT}`);
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// SEND BROCHURE
// ══════════════════════════════════════════════════════════════════
async function sendBrochure(send, project, customerName) {
  console.log(`   ✅ Sending: ${project.name}`);

  // Track hits per project
  stats.projectHits[project.key] = (stats.projectHits[project.key] || 0) + 1;

  const hi         = customerName ? `👋 *Hi ${customerName}!* ` : '';
  const highlights = (project.highlights || []).map(h => `  ✅ ${h}`).join('\n');
  const amenities  = (project.amenities  || []).map(a => `  • ${a}`).join('\n');
  const avail      = project.availability
    ? Object.entries(project.availability)
        .map(([t, c]) => `  • ${t}: ${c > 0 ? c + ' units available' : '❌ Sold Out'}`)
        .join('\n')
    : '';

  const message =
    `${hi}Thank you for your interest! 🎉\n\n` +
    `🏠 *${project.name}*\n` +
    `🏷️ *Type:* ${project.type}\n` +
    `📍 *Location:* ${project.location}\n` +
    `💰 *Price:* ${project.price}\n` +
    (project.approval ? `✔️ *Approval:* ${project.approval}\n` : '') +
    `\n` +
    (highlights ? `🌟 *Highlights:*\n${highlights}\n\n` : '') +
    (amenities  ? `🏊 *Amenities:*\n${amenities}\n\n`   : '') +
    (avail      ? `📊 *Availability:*\n${avail}\n\n`    : '') +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📄 *Download Brochure:*\n${project.brochureUrl}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 *What's next?*\n` +
    `• Reply *MENU* — View other projects\n` +
    `• Reply *VISIT* — Book a free site visit\n` +
    `• Reply *CALL* — Request a callback\n\n` +
    `_Erayaa Builders & Developers — Premium Real Estate, Bengaluru_ 🏠`;

  await send(message);
  stats.brochuresSent++;
}

// ══════════════════════════════════════════════════════════════════
// SMART PROJECT FINDER
// ══════════════════════════════════════════════════════════════════
function findProject(input) {
  if (!input) return null;
  const q = input.replace(/[*_]/g, '').trim().toLowerCase();

  if (BROCHURES[q]) return BROCHURES[q];

  for (const [key, project] of Object.entries(BROCHURES)) {
    if (q.includes(key) || key.includes(q)) return project;
  }

  const qWords = q.split(/\s+/).filter(w => w.length > 2);
  for (const [key, project] of Object.entries(BROCHURES)) {
    const kWords  = key.split(/\s+/).filter(w => w.length > 2);
    const nWords  = project.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const allWords = [...new Set([...kWords, ...nWords])];
    const matches  = qWords.filter(w => allWords.includes(w));
    if (matches.length >= 2) return project;
  }

  for (const [key, project] of Object.entries(BROCHURES)) {
    const kWords  = key.split(/\s+/).filter(w => w.length > 3);
    const nWords  = project.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const allWords = [...new Set([...kWords, ...nWords])];
    for (const qw of qWords) {
      if (allWords.includes(qw)) return project;
    }
  }

  return null;
}

// ── Launch ──────────────────────────────────────────────────────────
startBot().catch(err => { console.error('Fatal error:', err); process.exit(1); });
