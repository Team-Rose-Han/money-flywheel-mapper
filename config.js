// ============================================================
//  Money Flywheel Mapper — settings Rose's team can edit safely
// ============================================================
window.MAPPER_CONFIG = {
  brand: "30 Minute Money",
  toolName: "Money Flywheel Mapper",

  // ---- Gate -------------------------------------------------
  // Members type this code the first time they open the tool outside Circle
  // (for example from the Circle phone app). Change it by hashing a new code:
  //   printf 'NEWCODE' | shasum -a 256      (Mac terminal)
  // The code is compared in UPPERCASE, so "freedom" and "FREEDOM" both work.
  accessCodeHash: "ecdee7b6d15473195b595217a51932ca794692632c77bb37059209c4e82e02fb",

  // When the tool is embedded (iframe) on one of these hosts, no code is asked.
  allowedEmbedHosts: ["programs.rosehan.com", "rosehan.com", "circle.so"],

  // ---- Tax-year numbers (verify at irs.gov every January) ---
  taxYear: 2026,
  // Roth IRA income phase-out START by filing status. Above this, use the Backdoor Roth.
  rothPhaseoutStart: { single: 153000, mfj: 242000 },
  starterEmergencyFund: 2000,
  emergencyMonths: 6,

  // ---- "Where to open it" links ----------------------------
  // Leave a link empty and the checklist shows "Rose's pick coming soon".
  // Fill these with affiliate links when the tools hub is ready.
  links: {
    checking:  { label: "", url: "" },   // hub, bills, spending, upcoming, business checking
    hysa:      { label: "", url: "" },   // emergency fund, dream fund, house fund, taxes set-aside
    roth:      { label: "", url: "" },   // Roth IRA / Backdoor Roth IRA
    brokerage: { label: "", url: "" },   // taxable brokerage
    solo401k:  { label: "", url: "" },
    sepIra:    { label: "", url: "" },
    hsa:       { label: "", url: "" },
    plan529:   { label: "", url: "" },
  },
};
