// ══════════════════════════════════════════════════════════════════
// ERAYAA BUILDERS — WhatsApp Brochure Bot
// Built with whatsapp-web.js (free, unlimited messages)
//
// HOW IT WORKS:
// 1. Customer clicks "Send Brochure via WhatsApp" on website
// 2. WhatsApp opens with a pre-filled message like:
//    "Send me brochure: Erayaa Indranee Lake View"
// 3. Customer taps Send
// 4. This bot instantly reads the message and auto-replies with:
//    - A welcome message
//    - The correct brochure PDF link for that project
// ══════════════════════════════════════════════════════════════════

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { BROCHURES, GENERAL_BROCHURE_URL, WELCOME_MESSAGE } = require('./brochures');

// ── Express server (keeps Render.com free tier alive) ──────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Erayaa WhatsApp Bot</title></head>
      <body style="font-family:sans-serif;padding:40px;background:#f8f6f1;">
        <h2 style="color:#8B6914;">🏠 Erayaa WhatsApp Bot</h2>
        <p>Status: <strong style="color:green;">✅ Running</strong></p>
        <p>Bot is active and auto-sending brochures to customers.</p>
        <hr/>
        <h3>Stats</h3>
        <p>Total messages handled: <strong>${stats.totalMessages}</strong></p>
        <p>Brochures sent: <strong>${stats.brochuresSent}</strong></p>
        <p>Last message: <strong>${stats.lastMessage || 'None yet'}</strong></p>
        <p>Bot ready: <strong>${botReady ? '✅ Yes' : '⏳ Connecting...'}</strong></p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});

// ── Stats tracker ──────────────────────────────────────────────────
const stats = {
  totalMessages: 0,
  brochuresSent: 0,
  lastMessage: null
};

let botReady = false;

// ── WhatsApp Client Setup ──────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'erayaa-bot',
    dataPath: './.wwebjs_auth'   // session saved here — survives restarts
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--safebrowsing-disable-auto-update',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--ignore-certificate-errors-spki-list'
    ]
  }
});

// ── QR Code — scan once with your phone ───────────────────────────
client.on('qr', (qr) => {
  console.log('\n════════════════════════════════════════');
  console.log('📱 SCAN THIS QR CODE WITH WHATSAPP:');
  console.log('   Open WhatsApp → Settings → Linked Devices → Link a Device');
  console.log('════════════════════════════════════════\n');
  qrcode.generate(qr, { small: true });
  console.log('\n(QR expires in ~20 seconds — refresh if needed)\n');
});

// ── Ready ──────────────────────────────────────────────────────────
client.on('ready', () => {
  botReady = true;
  console.log('\n✅ Erayaa WhatsApp Bot is LIVE and ready!');
  console.log('📩 Listening for customer messages...\n');
});

// ── Authentication success ─────────────────────────────────────────
client.on('authenticated', () => {
  console.log('🔐 Authenticated successfully. Session saved.');
});

// ── Auth failure ───────────────────────────────────────────────────
client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
  console.log('Delete the .wwebjs_auth folder and restart to re-scan QR.');
});

// ── Disconnected ───────────────────────────────────────────────────
client.on('disconnected', (reason) => {
  botReady = false;
  console.warn('⚠️ Bot disconnected:', reason);
  console.log('Attempting to reconnect...');
  setTimeout(() => client.initialize(), 5000);
});

// ══════════════════════════════════════════════════════════════════
// MAIN MESSAGE HANDLER
// ══════════════════════════════════════════════════════════════════
client.on('message', async (msg) => {
  // Ignore group messages, status updates, and messages from the bot itself
  if (msg.isGroupMsg || msg.from === 'status@broadcast' || msg.fromMe) return;

  const body = msg.body || '';
  const from = msg.from;
  const lowerBody = body.toLowerCase().trim();

  stats.totalMessages++;
  stats.lastMessage = new Date().toLocaleString('en-IN');

  console.log(`\n📩 Message from ${from}:`);
  console.log(`   "${body}"`);

  // ── Detect brochure request from website ────────────────────────
  // Message format from website: "Send me brochure: <Project Name>"
  // or "Hi Erayaa Team! ... I'm interested in *Project Name*..."
  if (lowerBody.includes('brochure') || lowerBody.includes('interested in')) {
    await handleBrochureRequest(msg, body, lowerBody, from);
    return;
  }

  // ── VISIT keyword ──────────────────────────────────────────────
  if (lowerBody === 'visit' || lowerBody.includes('site visit') || lowerBody.includes('book visit')) {
    await msg.reply(
      `🗓️ *Book a Free Site Visit*\n\n` +
      `Thank you for your interest! Our property advisor will contact you shortly to schedule a complimentary site visit.\n\n` +
      `You can also fill the site visit form on our website:\n` +
      `🌐 https://erayaa.in\n\n` +
      `Or call us directly:\n` +
      `📞 Muniraj (GM): +91 63648 74166\n` +
      `📞 Jayaraj (RM): +91 99454 23048`
    );
    return;
  }

  // ── CALL keyword ───────────────────────────────────────────────
  if (lowerBody === 'call' || lowerBody.includes('callback') || lowerBody.includes('call me')) {
    await msg.reply(
      `📞 *Request a Callback*\n\n` +
      `Our team will call you back within 30 minutes during business hours (9AM – 7PM).\n\n` +
      `Or reach us directly:\n` +
      `📞 Muniraj (GM): +91 63648 74166\n` +
      `📞 Jayaraj (RM): +91 99454 23048\n\n` +
      `_Thank you for choosing Erayaa Builders & Developers!_ 🏠`
    );
    return;
  }

  // ── PROJECTS keyword ───────────────────────────────────────────
  if (lowerBody === 'projects' || lowerBody.includes('all projects') || lowerBody.includes('show projects')) {
    const projectList = Object.values(BROCHURES)
      .map((p, i) => `${i + 1}. *${p.name}*\n   📍 ${p.location}\n   ${p.description}`)
      .join('\n\n');

    await msg.reply(
      `🏘️ *Erayaa Builders — Active Projects*\n\n` +
      `${projectList}\n\n` +
      `Reply with the project name to get its brochure instantly!\n` +
      `Example: _Erayaa Indranee Lake View_`
    );
    return;
  }

  // ── Check if message matches a project name directly ───────────
  const matchedProject = findProject(lowerBody);
  if (matchedProject) {
    await sendBrochure(msg, matchedProject, from);
    return;
  }

  // ── Default greeting for unrecognized messages ─────────────────
  // Only reply if it looks like a genuine first contact
  if (lowerBody.includes('hi') || lowerBody.includes('hello') || lowerBody.includes('helo') ||
      lowerBody.includes('hey') || lowerBody.includes('namaste') || lowerBody.length < 20) {
    await msg.reply(WELCOME_MESSAGE);
  }
});

// ══════════════════════════════════════════════════════════════════
// HANDLE BROCHURE REQUEST
// ══════════════════════════════════════════════════════════════════
async function handleBrochureRequest(msg, body, lowerBody, from) {
  // Try to extract project name from the message
  // Website sends: "Hi Erayaa Team! 👋\n\nI'm interested in *Project Name* and..."
  let projectName = null;

  // Pattern 1: "Send me brochure: Project Name"
  const pattern1 = body.match(/brochure[:\s]+(.+?)(?:\n|$)/i);
  if (pattern1) projectName = pattern1[1].trim();

  // Pattern 2: "interested in *Project Name*"
  const pattern2 = body.match(/interested in \*?([^*\n]+)\*?/i);
  if (!projectName && pattern2) projectName = pattern2[1].trim();

  // Pattern 3: "interested in Project Name and"
  const pattern3 = body.match(/interested in ([^*\n]+?) and/i);
  if (!projectName && pattern3) projectName = pattern3[1].trim();

  console.log(`   🔍 Detected project name: "${projectName}"`);

  // Find the project in our config
  const project = projectName ? findProject(projectName.toLowerCase()) : null;

  if (project) {
    await sendBrochure(msg, project, from);
  } else {
    // Project not found — send general response + all projects list
    const projectList = Object.values(BROCHURES)
      .map((p, i) => `${i + 1}. *${p.name}* — ${p.location}`)
      .join('\n');

    await msg.reply(
      `🏠 *Welcome to Erayaa Builders & Developers!*\n\n` +
      `Thank you for your interest! Here are our active projects:\n\n` +
      `${projectList}\n\n` +
      `Reply with the project name to receive its brochure instantly.\n\n` +
      `For general enquiries:\n` +
      `📞 +91 63648 74166 (Muniraj - GM)\n` +
      `📞 +91 99454 23048 (Jayaraj - RM)`
    );
  }
}

// ══════════════════════════════════════════════════════════════════
// SEND BROCHURE FOR A SPECIFIC PROJECT
// ══════════════════════════════════════════════════════════════════
async function sendBrochure(msg, project, from) {
  console.log(`   ✅ Sending brochure for: ${project.name}`);

  // Step 1: Send welcome + brochure message
  await msg.reply(
    `🎉 *Thank you for your interest in ${project.name}!*\n\n` +
    `📍 *Location:* ${project.location}\n` +
    `${project.description}\n\n` +
    `📄 *Here is your brochure:*\n` +
    `${project.brochureUrl}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 *Next Steps:*\n` +
    `• Reply *VISIT* to book a free site visit\n` +
    `• Reply *CALL* to request a callback\n` +
    `• Reply *PROJECTS* to see all our projects\n\n` +
    `_Erayaa Builders & Developers — Premium Real Estate, Bengaluru_ 🏠`
  );

  stats.brochuresSent++;
  console.log(`   📨 Brochure sent! Total sent: ${stats.brochuresSent}`);
}

// ══════════════════════════════════════════════════════════════════
// FUZZY PROJECT FINDER
// Matches even if customer types partial or slightly wrong name
// ══════════════════════════════════════════════════════════════════
function findProject(query) {
  if (!query) return null;
  const q = query.toLowerCase().replace(/[*_]/g, '').trim();

  // Exact match
  if (BROCHURES[q]) return BROCHURES[q];

  // Partial match — check if query contains or is contained in project key
  for (const [key, project] of Object.entries(BROCHURES)) {
    if (q.includes(key) || key.includes(q)) return project;

    // Word-level match — if 2+ words match
    const queryWords = q.split(/\s+/).filter(w => w.length > 3);
    const keyWords = key.split(/\s+/).filter(w => w.length > 3);
    const matches = queryWords.filter(w => keyWords.includes(w));
    if (matches.length >= 2) return project;

    // Match against project name (not just key)
    const nameLower = project.name.toLowerCase();
    if (q.includes(nameLower) || nameLower.includes(q)) return project;
    const nameWords = nameLower.split(/\s+/).filter(w => w.length > 3);
    const nameMatches = queryWords.filter(w => nameWords.includes(w));
    if (nameMatches.length >= 2) return project;
  }

  return null;
}

// ── Start the bot ──────────────────────────────────────────────────
console.log('🚀 Starting Erayaa WhatsApp Bot...');
console.log('   Please wait while WhatsApp Web initializes...\n');
client.initialize();
