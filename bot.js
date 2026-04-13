// ══════════════════════════════════════════════════════════════════
// ERAYAA BUILDERS — WhatsApp Brochure Bot (Baileys — No Chrome!)
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
import { BROCHURES, PROJECT_DETAILS, WELCOME_MESSAGE } from './brochures.js';

// ── Express server ─────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
const stats = { totalMessages: 0, brochuresSent: 0, lastMessage: null };
let botReady = false;
let currentQRDataUrl = null;

// ── Project menu text (for manual requests) ────────────────────────
const PROJECT_MENU = {};
function buildMenuText() {
  const projects = Object.values(BROCHURES);
  projects.forEach((p, i) => { PROJECT_MENU[String(i + 1)] = p; });
  return (
    `🏘️ *Erayaa Builders & Developers*\n` +
    `_Premium Real Estate, Bengaluru_\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Please select a project by replying with its *number*:\n\n` +
    projects.map((p, i) => `${i + 1}️⃣ *${p.name}*\n    📍 ${p.location}`).join('\n\n') +
    `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
    `👉 *VISIT* — Book a free site visit\n` +
    `👉 *CALL* — Request a callback`
  );
}
const PROJECT_LIST_TEXT = buildMenuText();

// ── Web dashboard ──────────────────────────────────────────────────
app.get('/', (_, res) => res.send(`
  <html><head><title>Erayaa WhatsApp Bot</title><meta http-equiv="refresh" content="30"></head>
  <body style="font-family:sans-serif;padding:40px;background:#f8f6f1;">
    <h2 style="color:#8B6914;">🏠 Erayaa WhatsApp Bot</h2>
    <p>Status: <strong style="color:${botReady ? 'green' : 'orange'};">
      ${botReady ? '✅ Online & Running' : '⏳ Connecting...'}
    </strong></p>
    ${!botReady ? `<p><a href="/qr" style="background:#8B6914;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">📱 Scan QR Code</a></p>` : ''}
    <hr/>
    <p>Messages handled: <strong>${stats.totalMessages}</strong></p>
    <p>Brochures sent: <strong>${stats.brochuresSent}</strong></p>
    <p>Last activity: <strong>${stats.lastMessage || 'None yet'}</strong></p>
  </body></html>
`));

app.get('/qr', (_, res) => {
  if (botReady) return res.send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2 style="color:green;">✅ Bot already connected!</h2><a href="/">← Dashboard</a></body></html>`);
  if (currentQRDataUrl) return res.send(`
    <html><head><title>Scan QR</title><meta http-equiv="refresh" content="20"></head>
    <body style="font-family:sans-serif;padding:40px;text-align:center;background:#f8f6f1;">
      <h2 style="color:#8B6914;">📱 Scan with WhatsApp</h2>
      <img src="${currentQRDataUrl}" style="width:300px;height:300px;border:4px solid #8B6914;border-radius:12px;"/>
      <p>WhatsApp → <strong>Settings → Linked Devices → Link a Device</strong></p>
      <p style="color:#e07b00;font-size:13px;">⏰ Auto-refreshes every 20s</p>
    </body></html>`);
  return res.send(`<html><head><meta http-equiv="refresh" content="5"></head><body style="padding:40px;text-align:center;"><h2>⏳ QR loading... (auto-refreshes)</h2></body></html>`);
});

app.get('/ping', (_, res) => res.send('pong'));
app.listen(PORT, () => console.log(`✅ Web server on port ${PORT}`));

const logger = pino({ level: 'silent' });
const AUTH_FOLDER = './auth_info';

// ── Session store — tracks if customer is in menu-selection mode ───
const sessions = {}; // { [jid]: { state: 'menu' | 'done' } }
function getSession(jid) {
  if (!sessions[jid]) sessions[jid] = { state: 'new' };
  return sessions[jid];
}

// ══════════════════════════════════════════════════════════════════
// START BOT
// ══════════════════════════════════════════════════════════════════
async function startBot() {
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

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      try {
        currentQRDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        console.log('\n📱 QR ready! Open /qr in your browser to scan.');
      } catch (e) { console.error('QR error:', e); }
    }
    if (connection === 'open') {
      botReady = true; currentQRDataUrl = null;
      console.log('\n✅ Erayaa WhatsApp Bot is LIVE!\n');
    }
    if (connection === 'close') {
      botReady = false;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️  Disconnected:', lastDisconnect?.error?.message || 'Unknown');
      if (shouldReconnect) { console.log('🔄 Reconnecting in 5s...'); setTimeout(startBot, 5000); }
      else console.log('❌ Logged out. Delete auth_info and restart.');
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
      console.log(`\n📩 [${from}]: "${body.slice(0, 80)}"`);

      const send = async (text) => sock.sendMessage(from, { text }, { quoted: msg });

      // ── VISIT ────────────────────────────────────────────────
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

      // ── CALL ─────────────────────────────────────────────────
      if (lower === 'call' || lower.includes('callback') || lower.includes('call me')) {
        await send(
          `📞 *Request a Callback*\n\nOur team will call within 30 minutes (9AM–7PM).\n\n` +
          `📞 Muniraj (GM): +91 63648 74166\n` +
          `📞 Jayaraj (RM): +91 99454 23048`
        );
        continue;
      }

      // ── MENU / PROJECTS ───────────────────────────────────────
      if (lower === 'menu' || lower === 'projects' || lower.includes('all projects')) {
        session.state = 'menu';
        await send(PROJECT_LIST_TEXT);
        continue;
      }

      // ────────────────────────────────────────────────────────────
      // ✅ WEBSITE PRE-FILLED MESSAGE HANDLER
      // Detects format:
      //   "Hi Erayaa Team! 👋
      //    I'm interested in *Erayaa Indranee Lake View* and would like to receive the brochure.
      //    *Name:* Pavan
      //    *Phone:* +91 9876543211
      //    Please share the brochure. Thank you!"
      // ────────────────────────────────────────────────────────────
      if (lower.includes('interested in') || lower.includes('brochure')) {
        // Extract project name from between asterisks: *Project Name*
        const starMatch = body.match(/interested in \*([^*]+)\*/i);
        // Fallback: extract without asterisks
        const plainMatch = body.match(/interested in ([^\n*]+?)(?:\s+and|\s*\n|$)/i);

        const rawName = (starMatch?.[1] || plainMatch?.[1] || '').trim();

        // Extract customer name from *Name:* Pavan
        const nameMatch = body.match(/\*Name:\*\s*([^\n*]+)/i);
        const customerName = nameMatch?.[1]?.trim() || '';

        // Extract phone from *Phone:* +91 ...
        const phoneMatch = body.match(/\*Phone:\*\s*([^\n*]+)/i);
        const customerPhone = phoneMatch?.[1]?.trim() || '';

        console.log(`   👤 Customer: ${customerName} | 📞 ${customerPhone} | 🏠 ${rawName}`);

        const project = rawName ? findProject(rawName.toLowerCase()) : null;

        if (project) {
          await sendBrochureWithDetails(send, project, customerName, customerPhone);
        } else {
          // Project not identified — show numbered menu
          session.state = 'menu';
          await send(
            `👋 *Hi${customerName ? ' ' + customerName : ''}! Welcome to Erayaa Builders & Developers!*\n\n` +
            `Please select the project you're interested in:\n\n` +
            PROJECT_LIST_TEXT
          );
        }
        continue;
      }

      // ── Customer is in menu state — pick a number ─────────────
      if (session.state === 'menu') {
        const picked = PROJECT_MENU[body.trim()];
        if (picked) {
          await sendBrochureWithDetails(send, picked, '', '');
          session.state = 'done';
        } else {
          await send(`❌ Please reply with a number from the list:\n\n${PROJECT_LIST_TEXT}`);
        }
        continue;
      }

      // ── Greeting / first contact ──────────────────────────────
      if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') ||
          lower.includes('namaste') || lower.length < 15) {
        session.state = 'menu';
        await send(`👋 *Hi! Welcome to Erayaa Builders & Developers!*\n\n${PROJECT_LIST_TEXT}`);
        continue;
      }

      // ── Direct project name typed ─────────────────────────────
      const directMatch = findProject(lower);
      if (directMatch) {
        await sendBrochureWithDetails(send, directMatch, '', '');
        continue;
      }

      // ── Fallback ──────────────────────────────────────────────
      session.state = 'menu';
      await send(`🏠 *Erayaa Builders & Developers*\n\nSelect a project:\n\n${PROJECT_LIST_TEXT}`);
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// SEND BROCHURE WITH FULL PROJECT DETAILS + PERSONALISED GREETING
// ══════════════════════════════════════════════════════════════════
async function sendBrochureWithDetails(send, project, customerName, customerPhone) {
  console.log(`   ✅ Sending brochure: ${project.name}`);

  const details = PROJECT_DETAILS[project.key] || {};

  // Build highlights section
  const highlightLines = (details.highlights || [])
    .map(h => `  ✅ ${h}`)
    .join('\n');

  // Build amenities section
  const amenityLines = (details.amenities || [])
    .map(a => `  • ${a}`)
    .join('\n');

  // Build availability section
  const availLines = details.availability
    ? Object.entries(details.availability)
        .map(([type, count]) => `  • ${type}: ${count > 0 ? count + ' available' : '❌ Sold Out'}`)
        .join('\n')
    : '';

  const greeting = customerName
    ? `👋 *Hi ${customerName}!* Thank you for your interest.\n\n`
    : `🎉 *Thank you for your interest!*\n\n`;

  let message =
    greeting +
    `🏠 *${project.name}*\n` +
    `📍 *Location:* ${project.location}\n` +
    `💰 *Price:* ${project.price || 'Contact for pricing'}\n` +
    (project.approval ? `✔️ *Approval:* ${project.approval}\n` : '') +
    `\n` +
    (highlightLines ? `🌟 *Highlights:*\n${highlightLines}\n\n` : '') +
    (amenityLines   ? `🏊 *Amenities:*\n${amenityLines}\n\n` : '') +
    (availLines     ? `📊 *Availability:*\n${availLines}\n\n` : '') +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📄 *Download Brochure:*\n${project.brochureUrl}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 *Next Steps:*\n` +
    `• Reply *MENU* — View other projects\n` +
    `• Reply *VISIT* — Book a free site visit\n` +
    `• Reply *CALL* — Request a callback\n\n` +
    `_Erayaa Builders & Developers — Premium Real Estate, Bengaluru_ 🏠`;

  await send(message);
  stats.brochuresSent++;
}

// ══════════════════════════════════════════════════════════════════
// FUZZY PROJECT FINDER
// ══════════════════════════════════════════════════════════════════
function findProject(query) {
  if (!query) return null;
  const q = query.replace(/[*_]/g, '').trim();
  if (BROCHURES[q]) return BROCHURES[q];
  for (const [key, project] of Object.entries(BROCHURES)) {
    if (q.includes(key) || key.includes(q)) return project;
    const qW = q.split(/\s+/).filter(w => w.length > 3);
    const kW = key.split(/\s+/).filter(w => w.length > 3);
    if (qW.filter(w => kW.includes(w)).length >= 2) return project;
    const nW = project.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (qW.filter(w => nW.includes(w)).length >= 2) return project;
  }
  return null;
}

// ── Launch ─────────────────────────────────────────────────────────
startBot().catch(err => { console.error('Fatal error:', err); process.exit(1); });
