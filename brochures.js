// ══════════════════════════════════════════════════
// ERAYAA BROCHURE & PROJECT DETAILS CONFIG
// ══════════════════════════════════════════════════

// ── Short config used for menu & matching ─────────
export const BROCHURES = {

  "erayaa indranee lake view": {
    key: "eilv",
    name: "Erayaa Indranee Lake View",
    location: "Bidadi, Bengaluru-Mysore Road",
    price: "Rs.3,999/sqft onwards",
    approval: "DC Converted, E-Khata",
    brochureUrl: "https://drive.google.com/file/d/YOUR_FILE_ID_EILV/view", // 🔁 Replace
  },

  "erayaa green woods": {
    key: "egw",
    name: "Erayaa Green Woods",
    location: "Mysore Road, BLR West",
    price: "Contact for pricing",
    approval: "BMRD E-Khata",
    brochureUrl: "https://drive.google.com/file/d/YOUR_FILE_ID_EGW/view", // 🔁 Replace
  },

  "erayaa silver oak": {
    key: "eso",
    name: "Erayaa Silver Oak",
    location: "Kanakapura Road",
    price: "Contact for pricing",
    approval: "RERA Certified",
    brochureUrl: "https://drive.google.com/file/d/YOUR_FILE_ID_ESO/view", // 🔁 Replace
  },

  "erayaa pearl": {
    key: "ep",
    name: "Erayaa Pearl",
    location: "Sarjapur Road",
    price: "Contact for pricing",
    approval: "RERA Certified",
    brochureUrl: "https://drive.google.com/file/d/YOUR_FILE_ID_EP/view",  // 🔁 Replace
  },

  // ── Add more projects here ──
  // "erayaa project name": {
  //   key: "epn",
  //   name: "Erayaa Project Name",
  //   location: "Location, Bengaluru",
  //   price: "Rs.X,XXX/sqft",
  //   approval: "RERA / BMRD / E-Khata",
  //   brochureUrl: "https://drive.google.com/...",
  // },
};

// ── Full details per project (shown in WhatsApp reply) ────────────
// key must match the "key" field above
export const PROJECT_DETAILS = {

  eilv: {
    highlights: [
      "Prime location at Bidadi, Bengaluru-Mysore Express Highway",
      "Wonderla Amusement Park — 1.5 km | Eagleton Golf Resort — 3.6 km",
      "Hejjala Railway Station — 4 km | Bidadi Railway Station — 4 km",
      "Plot sizes: 30×40, 30×50, 40×60 & Odd plots",
      "DC Converted with individual E-Khata for each plot",
      "Near Toyota Kirloskar, Bosch, Britannia — Industrial Hub",
      "Metro Project 3rd Phase in progress — Challaghatta Metro 10 km",
      "Home loan options available",
    ],
    amenities: [
      "24/7 Security & Gated Community",
      "Underground Drainage",
      "Landscaped Garden & Children's Play Area",
      "Street Lighting via UG Cable",
      "24hr Water Supply (Overhead Tank)",
      "Tar Road with wide internal roads",
    ],
    availability: {
      "30×40 Plot": 12,
      "30×50 Plot": 8,
      "40×60 Plot": 5,
    },
  },

  egw: {
    highlights: [
      "Located on Mysore Road — one of Bengaluru's fastest growing corridors",
      "BMRD approved with E-Khata",
      "Well-connected to NICE Road, Kengeri Metro",
      "Close to schools, hospitals, and IT hubs",
      "Gated community with full infrastructure",
    ],
    amenities: [
      "24/7 Security",
      "Underground Drainage",
      "Landscaped Entrance",
      "Wide Tar Roads",
      "Water & Electricity connections",
    ],
    availability: {
      "30×40 Plot": 10,
      "30×50 Plot": 6,
    },
  },

  eso: {
    highlights: [
      "Exclusive villaments on Kanakapura Road",
      "RERA registered project",
      "Private gardens and sky decks per unit",
      "Concierge services",
      "Close to Art of Living campus, Bannerghatta Road",
    ],
    amenities: [
      "Swimming Pool",
      "Gymnasium",
      "Club House",
      "Private Garden",
      "24/7 Security & CCTV",
      "Power Backup",
    ],
    availability: {
      "3BHK Villament": 4,
      "4BHK Villament": 2,
    },
  },

  ep: {
    highlights: [
      "RERA-certified high-rise apartments",
      "Located in the prime Sarjapur Road corridor",
      "Excellent IT corridor connectivity",
      "Smart home features",
      "World-class amenities",
    ],
    amenities: [
      "Swimming Pool",
      "Gymnasium & Spa",
      "Club House & Co-working Space",
      "Children's Play Area",
      "Indoor Games Room",
      "24/7 Security & Video Door Phone",
      "Power Backup",
      "EV Charging Points",
    ],
    availability: {
      "2BHK": 8,
      "3BHK": 5,
      "4BHK": 2,
    },
  },

};

// ── Welcome message (for greetings & unknown messages) ────────────
export const WELCOME_MESSAGE = `🏠 *Welcome to Erayaa Builders & Developers!*

Thank you for your interest in our premium properties.

Our portfolio:
• 🏞️ *Residential Plots* — Mysore Road, Bidadi
• 🏢 *Luxury Apartments* — Sarjapur, RR Nagar
• 🏡 *Villaments* — Kanakapura Road

Reply with a project name or type *MENU* to see all projects!`;
