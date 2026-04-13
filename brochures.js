// ══════════════════════════════════════════════════
// ERAYAA BROCHURE LINKS CONFIG
// ══════════════════════════════════════════════════
// Add your brochure PDF links here for each project.
// Use Google Drive share links, Dropbox, or any direct URL.
//
// HOW TO GET A GOOGLE DRIVE LINK:
// 1. Upload PDF to Google Drive
// 2. Right click → Share → Change to "Anyone with the link"
// 3. Copy the link and paste it below
// ══════════════════════════════════════════════════

const BROCHURES = {

  // ── BLR WEST ──────────────────────────────────────
  "erayaa indranee lake view": {
    name: "Erayaa Indranee Lake View",
    location: "Bidadi, Bengaluru-Mysore Road",
    brochureUrl: "https://drive.google.com/file/d/YOUR_FILE_ID_HERE/view", // 🔁 Replace with real link
    description: "Residential plots at Bidadi — DC E-Khata, Rs.3,999/sqft"
  },

  "erayaa green woods": {
    name: "Erayaa Green Woods",
    location: "Mysore Road, BLR West",
    brochureUrl: "https://drive.google.com/file/d/YOUR_FILE_ID_HERE/view", // 🔁 Replace with real link
    description: "Premium plots on Mysore Road"
  },

  "erayaa silver oak": {
    name: "Erayaa Silver Oak",
    location: "Kanakapura Road",
    brochureUrl: "https://drive.google.com/file/d/YOUR_FILE_ID_HERE/view", // 🔁 Replace with real link
    description: "Villaments on Kanakapura Road — RERA certified"
  },

  "erayaa pearl": {
    name: "Erayaa Pearl",
    location: "Sarjapur Road",
    brochureUrl: "https://drive.google.com/file/d/YOUR_FILE_ID_HERE/view", // 🔁 Replace with real link
    description: "Luxury apartments — 2BHK, 3BHK, 4BHK"
  },

  // Add more projects below in the same format:
  // "project name in lowercase": {
  //   name: "Full Project Name",
  //   location: "Location",
  //   brochureUrl: "https://...",
  //   description: "Short description"
  // },
};

// ── General / No project specified ──────────────────
const GENERAL_BROCHURE_URL = "https://drive.google.com/file/d/YOUR_GENERAL_BROCHURE_ID/view"; // 🔁 Replace

// ── Welcome message sent to every new lead ───────────
const WELCOME_MESSAGE = `🏠 *Welcome to Erayaa Builders & Developers!*

Thank you for your interest in our premium properties across Bengaluru.

Our portfolio includes:
• 🏞️ *Residential Plots* — Mysore Road, Bidadi
• 🏢 *Luxury Apartments* — Sarjapur, RR Nagar
• 🏡 *Villaments* — Kanakapura Road

I'm sending you the brochure right away! ✨

For a *free site visit* or any queries, reply with:
👉 *VISIT* — to book a site visit
👉 *CALL* — to request a callback
👉 *PROJECTS* — to see all projects`;

module.exports = { BROCHURES, GENERAL_BROCHURE_URL, WELCOME_MESSAGE };
