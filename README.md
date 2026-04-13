# 🏠 Erayaa WhatsApp Brochure Bot

Automatically sends the correct project brochure to customers the moment they message on WhatsApp — **free, unlimited, 24/7, zero human intervention.**

---

## ⚡ How It Works

1. Customer clicks **"Send Brochure via WhatsApp"** on your website
2. WhatsApp opens with a pre-filled message (their name + project they want)
3. Customer taps **Send**
4. Bot instantly reads the project name → replies with the brochure link
5. Done ✅ — no human needed

---

## 📋 STEP 1 — Add Your Brochure Links

Open **`brochures.js`** and replace each `YOUR_FILE_ID_HERE` with your real Google Drive brochure links.

### How to get a Google Drive shareable link:
1. Upload your brochure PDF to Google Drive
2. Right-click the file → **Share**
3. Change access to **"Anyone with the link"**
4. Click **Copy link**
5. Paste it in `brochures.js`

```js
"erayaa indranee lake view": {
  name: "Erayaa Indranee Lake View",
  location: "Bidadi, Bengaluru-Mysore Road",
  brochureUrl: "https://drive.google.com/file/d/PASTE_YOUR_ID_HERE/view",
  description: "Residential plots at Bidadi — DC E-Khata, Rs.3,999/sqft"
},
```

---

## 📋 STEP 2 — Deploy to Render.com (FREE)

### 2a. Push code to GitHub
1. Create a free account at **github.com**
2. Create a new repository called `erayaa-whatsapp-bot`
3. Upload all these files to the repository

### 2b. Deploy on Render
1. Create a free account at **render.com**
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account → select `erayaa-whatsapp-bot` repo
4. Fill in settings:
   - **Name:** erayaa-whatsapp-bot
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Click **"Create Web Service"**
6. Wait ~3 minutes for it to build

---

## 📋 STEP 3 — Scan QR Code (One Time Only)

1. Once deployed, open your Render dashboard
2. Click on your service → **"Logs"** tab
3. You'll see a QR code printed in the logs
4. On the WhatsApp phone you want to use as the bot:
   - Open WhatsApp → **Settings → Linked Devices → Link a Device**
   - Scan the QR code
5. Done! The bot is now live ✅

> ⚠️ **Important:** Use a dedicated phone number for the bot (not your personal one). You can get a new SIM for ₹50–100.

---

## 📋 STEP 4 — Add Disk Storage on Render (Save Session)

This is important so the bot doesn't ask you to scan QR every time it restarts.

1. In Render dashboard → your service → **"Disks"** tab
2. Click **"Add Disk"**
3. Settings:
   - **Name:** whatsapp-session
   - **Mount Path:** `/opt/render/project/src/.wwebjs_auth`
   - **Size:** 1 GB (free)
4. Save → the service will restart with persistent session storage

---

## 🤖 Bot Commands (Customers Can Use)

| Customer types | Bot responds with |
|---|---|
| *(Website pre-filled message)* | Welcome + correct project brochure |
| Project name (e.g. "Indranee Lake View") | That project's brochure |
| `PROJECTS` | List of all active projects |
| `VISIT` | Site visit booking info + contact numbers |
| `CALL` | Callback request + contact numbers |
| `Hi` / `Hello` / `Hey` | General welcome message |

---

## 🔧 Adding New Projects

Open `brochures.js` and add a new entry:

```js
"erayaa new project name": {
  name: "Erayaa New Project Name",
  location: "Location, Bengaluru",
  brochureUrl: "https://drive.google.com/file/d/YOUR_ID/view",
  description: "Short description of the project"
},
```

Then push the change to GitHub → Render auto-deploys in ~2 minutes.

---

## 📊 Monitor the Bot

Visit your Render service URL (e.g. `https://erayaa-whatsapp-bot.onrender.com`) to see:
- ✅ Bot status (Running / Connecting)
- Total messages handled
- Total brochures sent
- Last message time

---

## ❓ Troubleshooting

| Problem | Solution |
|---|---|
| QR code not showing | Check Render logs tab |
| Bot not replying | Make sure QR was scanned successfully |
| Session expired | Re-scan QR in Render logs |
| Wrong brochure sent | Check project name spelling in `brochures.js` |
| Render service sleeping | Free tier sleeps after 15 min — upgrade to $7/mo Starter to keep it always on, OR use UptimeRobot (free) to ping every 10 min |

### Keep Free Tier Always Awake (UptimeRobot)
1. Sign up free at **uptimerobot.com**
2. Add a monitor → HTTP(s)
3. URL: your Render service URL
4. Interval: every 5 minutes
5. This pings the bot regularly so it never sleeps ✅

---

## 📞 Support

Built for Erayaa Builders & Developers, Bengaluru.

Contact numbers configured in bot:
- Muniraj (GM): +91 63648 74166
- Jayaraj (RM): +91 99454 23048
