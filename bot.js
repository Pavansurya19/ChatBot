// ══════════════════════════════════════════════════════════════════
// ERAYAA BUILDERS — WhatsApp Brochure Bot (Baileys — No Chrome!)
// Lightweight: connects to WhatsApp directly, no browser needed
// Deploys in under 60 seconds on any free server
// ══════════════════════════════════════════════════════════════════

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  Browsers
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import express from 'express';
import { readFileSync, existsSync } from 'fs';
import pino from 'pino';

// Import brochure config
import { BROCHURES, WELCOME_MESSAGE } from './brochures.js';

// ── Express server (keeps free hosting alive) ──────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

const stats = { totalMessages: 0, brochuresSent: 0, lastMessage: null };
let botReady = false;

app.get('/', (_, res) => res.send(`
  <html><head><title>Erayaa WhatsApp Bot</title></head>
  <body style="font-family:sans-serif;padding:40px;background:#f8f6f1;">
    <h2 style="color:#8B6914;">🏠 Erayaa WhatsApp Bot</h2>
    <p>Status: <strong style="color:${botReady?'green':'orange'};">${botReady?'✅ Online & Running':'⏳ Connecting...'}</strong></p>
    <hr/>
    <p>Total messages handled: <strong>${stats.totalMessages}</strong></p>
    <p>Brochures sent: <strong>${stats.brochuresSent}</strong></p>
    <p>Last activity: <strong>${stats.lastMessage||'None yet'}</strong></p>
  </body></html>
`));

// Health ping endpoint (for UptimeRobot)
app.get('/ping', (_, res) => res.send('pong'));

app.listen(PORT, () => console.log(`✅ Web server running on port ${PORT}`));

// ── Silent logger (no noise in logs) ──────────────────────────────
const logger = pino({ level: 'silent' });

// ── Auth state (persists session across restarts) ──────────────────
const AUTH_FOLDER = './auth_info';

// ══════════════════════════════════════════════════════════════════
// START BOT
// ══════════════════════════════════════════════════════════════════
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`\n🚀 Starting Erayaa WhatsApp Bot (Baileys v${version.join('.')})`);

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false, // we handle QR ourselves
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  });

  // ── Save credentials on update ─────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Connection updates ─────────────────────────────────────────
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Show QR code in terminal for scanning
    if (qr) {
      console.log('\n════════════════════════════════════════════════');
      console.log('📱 SCAN THIS QR CODE WITH WHATSAPP:');
      console.log('   WhatsApp → Settings → Linked Devices → Link a Device');
      console.log('════════════════════════════════════════════════\n');
      qrcode.generate(qr, { small: true });
      console.log('\n⏰ QR expires in ~20 seconds. Refresh page if needed.\n');
    }

    if (connection === 'open') {
      botReady = true;
      console.log('\n✅ Erayaa WhatsApp Bot is LIVE!');
      console.log('📩 Listening for customer messages...\n');
    }

    if (connection === 'close') {
      botReady = false;
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log('⚠️  Connection closed. Reason:', lastDisconnect?.error?.message || 'Unknown');

      if (shouldReconnect) {
        console.log('🔄 Reconnecting in 5 seconds...');
        setTimeout(startBot, 5000);
      } else {
        console.log('❌ Logged out. Please delete the auth_info folder and restart.');
      }
    }
  });

  // ══════════════════════════════════════════════════════════════
  // MAIN MESSAGE HANDLER
  // ══════════════════════════════════════════════════════════════
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // Skip: outgoing, group, status broadcast
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;
      if (msg.key.remoteJid.endsWith('@g.us')) continue;

      const from = msg.key.remoteJid;
      const body = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        ''
      ).trim();

      if (!body) continue;

      const lower = body.toLowerCase();
      stats.totalMessages++;
      stats.lastMessage = new Date().toLocaleString('en-IN');

      console.log(`\n📩 From ${from}: "${body}"`);

      // Helper to send a reply
      const reply = async (text) => {
        await sock.sendMessage(from, { text }, { quoted: msg });
      };

      // ── Brochure request from website ──────────────────────────
      if (lower.includes('brochure') || lower.includes('interested in')) {
        await handleBrochureRequest(reply, body, lower);
        continue;
      }

      // ── VISIT ──────────────────────────────────────────────────
      if (lower === 'visit' || lower.includes('site visit') || lower.includes('book visit')) {
        await reply(
          `🗓️ *Book a Free Site Visit*\n\n` +
          `Our property advisor will contact you shortly to schedule a complimentary guided tour.\n\n` +
          `📞 Muniraj (GM): +91 63648 74166\n` +
          `📞 Jayaraj (RM): +91 99454 23048\n\n` +
          `Or visit: https://erayaa.in`
        );
        continue;
      }

      // ── CALL ───────────────────────────────────────────────────
      if (lower === 'call' || lower.includes('callback') || lower.includes('call me')) {
        await reply(
          `📞 *Request a Callback*\n\n` +
          `Our team will call you back within 30 minutes (9AM–7PM).\n\n` +
          `📞 Muniraj (GM): +91 63648 74166\n` +
          `📞 Jayaraj (RM): +91 99454 23048`
        );
        continue;
      }

      // ── PROJECTS ───────────────────────────────────────────────
      if (lower === 'projects' || lower.includes('all projects')) {
        const list = Object.values(BROCHURES)
          .map((p, i) => `${i+1}. *${p.name}*\n   📍 ${p.location}`)
          .join('\n\n');
        await reply(
          `🏘️ *Erayaa Builders — Active Projects*\n\n${list}\n\n` +
          `Reply with any project name to get its brochure instantly!`
        );
        continue;
      }

      // ── Direct project name match ───────────────────────────────
      const project = findProject(lower);
      if (project) {
        await sendBrochure(reply, project);
        continue;
      }

      // ── Default greeting ────────────────────────────────────────
      if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') ||
          lower.includes('namaste') || lower.length < 20) {
        await reply(WELCOME_MESSAGE);
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// HANDLE BROCHURE REQUEST
// ══════════════════════════════════════════════════════════════════
async function handleBrochureRequest(reply, body, lower) {
  let projectName = null;

  // Pattern: "interested in *Project Name*"
  const m1 = body.match(/interested in \*?([^*\n]+?)\*?(?:\s+and|\s*$)/i);
  if (m1) projectName = m1[1].trim();

  // Pattern: "brochure: Project Name"
  const m2 = body.match(/brochure[:\s]+(.+?)(?:\n|$)/i);
  if (!projectName && m2) projectName = m2[1].trim();

  const project = projectName ? findProject(projectName.toLowerCase()) : null;

  if (project) {
    await sendBrochure(reply, project);
  } else {
    const list = Object.values(BROCHURES)
      .map((p, i) => `${i+1}. *${p.name}* — ${p.location}`)
      .join('\n');
    await reply(
      `🏠 *Welcome to Erayaa Builders & Developers!*\n\n` +
      `Here are our active projects:\n\n${list}\n\n` +
      `Reply with the project name to get its brochure instantly.\n\n` +
      `📞 +91 63648 74166 (Muniraj - GM)`
    );
  }
}

// ══════════════════════════════════════════════════════════════════
// SEND BROCHURE
// ══════════════════════════════════════════════════════════════════
async function sendBrochure(reply, project) {
  console.log(`   ✅ Sending brochure: ${project.name}`);
  await reply(
    `🎉 *Thank you for your interest in ${project.name}!*\n\n` +
    `📍 *Location:* ${project.location}\n` +
    `${project.description}\n\n` +
    `📄 *Your Brochure:*\n${project.brochureUrl}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 *What's next?*\n` +
    `• Reply *VISIT* — Book a free site visit\n` +
    `• Reply *CALL* — Request a callback\n` +
    `• Reply *PROJECTS* — See all projects\n\n` +
    `_Erayaa Builders & Developers — Premium Real Estate, Bengaluru_ 🏠`
  );
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

    const qWords = q.split(/\s+/).filter(w => w.length > 3);
    const kWords = key.split(/\s+/).filter(w => w.length > 3);
    if (qWords.filter(w => kWords.includes(w)).length >= 2) return project;

    const nWords = project.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (qWords.filter(w => nWords.includes(w)).length >= 2) return project;
  }
  return null;
}

// ── Launch ─────────────────────────────────────────────────────────
startBot().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
