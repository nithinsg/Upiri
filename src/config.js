/* ================= CONFIG — set before public launch ================= */
export const WHATSAPP_NUMBER = "91XXXXXXXXXX"; // replace with the single ŪPIRI booking line
export const EMERGENCY_NUMBER = "105910"; // Yashoda Hospitals emergency line
export const HOSPITAL = "Yashoda Hospitals";

/* Brand tagline (Telugu), shown under the wordmark in the header and footer.
   TODO: confirm final Telugu tagline with brand team — the voice-note wording
   was unclear ("Me, Ma…"). Placeholder means "Assurance for your breath". */
export const BRAND_TAGLINE_TE = "మీ ఊపిరికి భరోసా";

/* ================= BRAND TOKENS ================= */
export const C = {
  indigo: "#2C2A6B",
  ink: "#1D1B4B",
  marigold: "#F5821F",
  marigoldSoft: "#FDEBD9",
  sky: "#EDF2F8",
  mist: "#DDE4EF",
  card: "#FFFFFF",
  green: "#2F8F5B",
  greenSoft: "#E3F2E9",
  amber: "#C98A00",
  amberSoft: "#FBF1DC",
  red: "#CE4438",
  redSoft: "#FBE7E5",
  indigoSoft: "#E7E7F4",
};

export const waLink = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

export const telLink = (number = EMERGENCY_NUMBER) => `tel:${number}`;
