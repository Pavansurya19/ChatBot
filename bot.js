// ══════════════════════════════════════════════════════════════════
// ERAYAA BUILDERS — WhatsApp Brochure Bot
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
import { BROCHURES, WELCOME_MESSAGE } from './brochures.js';

// ── Express server ─────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
const stats = { totalMessages: 0, brochuresSent: 0, lastMessage: null };
let botReady = false;
let currentQRDataUrl = null;

// ── Build numbered menu ────────────────────────────────────────────
const PROJECT_MENU = {};   // { "1": project, "2": project, ... }
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

// ── Web dashboard ──────────────────────────────────────────────────
app.get('/', (_, res) => res.send(`
  <html><head><title>Erayaa WhatsApp Bot</title><meta http-equiv="refresh" content="30"></head>
  <body style="font-family:sans-serif;padding:40px;background:#f8f6f1;">
    <h2 style="color:#8B6914;">🏠 Erayaa WhatsApp Bot</h2>
    <p>Status: <strong style="color:${botReady ? 'green' : 'orange'};">${botReady ? '✅ Online & Running' : '⏳ Connecting...'}</strong></p>
    ${!botReady ? `<p><a href="/qr" style="background:#8B6914;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">📱 Scan QR Code</a></p>` : ''}
    <hr/>
    <p>Messages: <strong>${stats.totalMessages}</strong> | Brochures sent: <strong>${stats.brochuresSent}</strong></p>
    <p>Last activity: <strong>${stats.lastMessage || 'None yet'}</strong></p>
    <hr/><h3>Active Projects</h3>
    <ul>${ALL_PROJECTS.map((p, i) => `<li><strong>${i+1}. ${p.name}</strong> — ${p.location}</li>`).join('')}</ul>
  </body></html>
`));

app.get('/qr', (_, res) => {
  if (botReady) return res.send(`<html><body style="padding:40px;text-align:center;font-family:sans-serif;"><h2 style="color:green;">✅ Bot already connected!</h2><a href="/">← Dashboard</a></body></html>`);
  if (currentQRDataUrl) return res.send(`
    <html><head><title>Scan QR</title><meta http-equiv="refresh" content="20"></head>
    <body style="font-family:sans-serif;padding:40px;text-align:center;background:#f8f6f1;">
      <h2 style="color:#8B6914;">📱 Scan with WhatsApp</h2>
      <img src="${currentQRDataUrl}" style="width:300px;height:300px;border:4px solid #8B6914;border-radius:12px;"/>
      <p>WhatsApp → <strong>Settings → Linked Devices → Link a Device</strong></p>
      <p style="color:#e07b00;font-size:13px;">⏰ Auto-refreshes every 20s for new QR</p>
    </body></html>`);
  return res.send(`<html><head><meta http-equiv="refresh" content="4"></head><body style="padding:40px;text-align:center;"><h2>⏳ QR loading... (auto-refreshes)</h2></body></html>`);
});

app.get('/ping', (_, res) => res.send('pong'));
app.listen(PORT, () => console.log(`✅ Web server on port ${PORT}`));

const logger = pino({ level: 'silent' });
const AUTH_FOLDER = './auth_info';

// ── Sessions — track if customer is waiting to pick from menu ──────
const sessions = {};
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
        console.log('\n📱 QR ready! Open your Render URL + /qr to scan.');
      } catch (e) { console.error('QR error:', e); }
    }
    if (connection === 'open') {
      botReady = true; currentQRDataUrl = null;
      console.log('\n✅ Erayaa WhatsApp Bot is LIVE!\n');
    }
    if (connection === 'close') {
      botReady = false;
      const reconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️  Disconnected:', lastDisconnect?.error?.message || 'Unknown');
      if (reconnect) { console.log('🔄 Reconnecting in 5s...'); setTimeout(startBot, 5000); }
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

      const from    = msg.key.remoteJid;
      const body    = (
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
          `📞 *Request a Callback*\n\nOur team calls within 30 minutes (9AM–7PM).\n\n` +
          `📞 Muniraj (GM): +91 63648 74166\n` +
          `📞 Jayaraj (RM): +91 99454 23048`
        );
        continue;
      }

      // ── MENU / PROJECTS ───────────────────────────────────────
      if (lower === 'menu' || lower === 'projects' || lower.includes('all projects')) {
        session.state = 'menu';
        await send(MENU_TEXT);
        continue;
      }

      // ────────────────────────────────────────────────────────────
      // ✅ WEBSITE MESSAGE HANDLER
      // Handles this exact format from the website:
      //   "Hi Erayaa Team! 👋
      //    I'm interested in Erayaa Gravity Aranya and would like to receive the brochure.
      //    Name: Pavan
      //    Phone: +91 9876543211
      //    Please share the brochure. Thank you!"
      // ────────────────────────────────────────────────────────────
      if (lower.includes('interested in') || (lower.includes('brochure') && lower.includes('erayaa'))) {

        // ── Extract project name — tries 3 patterns ──────────────
        let projectName = null;

        // Pattern 1: "interested in *Erayaa Gravity Aranya*" (with asterisks)
        const p1 = body.match(/interested in \*([^*\n]+)\*/i);
        if (p1) projectName = p1[1].trim();

        // Pattern 2: "interested in Erayaa Gravity Aranya and" (no asterisks, plain text)
        if (!projectName) {
          const p2 = body.match(/interested in ([^\n]+?)(?:\s+and\s|\s*\n|$)/i);
          if (p2) projectName = p2[1].trim();
        }

        // Pattern 3: any "Erayaa XXXX" in the message
        if (!projectName) {
          const p3 = body.match(/Erayaa\s+[A-Za-z\s]+/i);
          if (p3) projectName = p3[0].trim();
        }

        // ── Extract customer name ────────────────────────────────
        const nameMatch = body.match(/(?:\*?Name:?\*?)\s*([^\n*]+)/i);
        const customerName = nameMatch?.[1]?.trim() || '';

        // ── Extract phone ────────────────────────────────────────
        const phoneMatch = body.match(/(?:\*?Phone:?\*?)\s*([^\n*]+)/i);
        const customerPhone = phoneMatch?.[1]?.trim() || '';

        console.log(`   👤 Name: "${customerName}" | 📞 "${customerPhone}" | 🏠 "${projectName}"`);

        const project = projectName ? findProject(projectName) : null;

        if (project) {
          // ✅ Project found — send brochure directly
          await sendBrochure(send, project, customerName);
        } else {
          // ❌ Project not matched — show menu
          session.state = 'menu';
          const greeting = customerName ? `👋 *Hi ${customerName}!*` : `👋 *Hi!*`;
          await send(
            `${greeting} Welcome to Erayaa Builders & Developers!\n\n` +
            `Please select the project you're interested in:\n\n` +
            MENU_TEXT
          );
        }
        continue;
      }

      // ── Customer picking from menu (replied with a number) ────
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

      // ── Greeting / first message ──────────────────────────────
      if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') ||
          lower.includes('namaste') || lower.length < 15) {
        session.state = 'menu';
        await send(`👋 *Hi! Welcome to Erayaa Builders & Developers!*\n\n${MENU_TEXT}`);
        continue;
      }

      // ── Direct project name typed by customer ─────────────────
      const directMatch = findProject(body);
      if (directMatch) {
        await sendBrochure(send, directMatch, '');
        continue;
      }

      // ── Fallback — show menu ──────────────────────────────────
      session.state = 'menu';
      await send(`🏠 *Erayaa Builders & Developers*\n\nHere are our projects:\n\n${MENU_TEXT}`);
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// SEND BROCHURE — full project details + personalised greeting
// ══════════════════════════════════════════════════════════════════
async function sendBrochure(send, project, customerName) {
  console.log(`   ✅ Sending: ${project.name}`);

  const hi = customerName ? `👋 *Hi ${customerName}!* ` : '';

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
// Handles: full name, partial name, typos, with/without asterisks
// ══════════════════════════════════════════════════════════════════
function findProject(input) {
  if (!input) return null;

  // Clean input — remove asterisks, extra spaces, lowercase
  const q = input.replace(/[*_]/g, '').trim().toLowerCase();

  // 1. Exact key match
  if (BROCHURES[q]) return BROCHURES[q];

  // 2. Key contains query or query contains key
  for (const [key, project] of Object.entries(BROCHURES)) {
    if (q.includes(key) || key.includes(q)) return project;
  }

  // 3. Word-level matching — match if 2+ meaningful words overlap
  const qWords = q.split(/\s+/).filter(w => w.length > 2);
  for (const [key, project] of Object.entries(BROCHURES)) {
    const kWords = key.split(/\s+/).filter(w => w.length > 2);
    const nWords = project.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const allWords = [...new Set([...kWords, ...nWords])];
    const matches = qWords.filter(w => allWords.includes(w));
    if (matches.length >= 2) return project;
  }

  // 4. Single unique word match — e.g. "Aranya" → Gravity Aranya
  //    "Pearl" → Vistar White Pearl, "Infra" → Infra Hub etc.
  for (const [key, project] of Object.entries(BROCHURES)) {
    const kWords = key.split(/\s+/).filter(w => w.length > 3);
    const nWords = project.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const allWords = [...new Set([...kWords, ...nWords])];
    // If any single query word uniquely identifies this project
    for (const qw of qWords) {
      if (allWords.includes(qw)) return project;
    }
  }

  return null;
}

// ── Launch ─────────────────────────────────────────────────────────
startBot().catch(err => { console.error('Fatal error:', err); process.exit(1); });
