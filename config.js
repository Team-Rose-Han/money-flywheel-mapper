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

  // ---- Recommended banks --------------------------------------
  // Shown as a link on the "which bank" screens. Leave a url empty and no link appears.
  links: {
    checking:    { label: "Rose's recommended banks for personal checking", url: "" },
    bizChecking: { label: "Rose's recommended banks for business checking", url: "" },
  },

  // ---- The one rule about where to open accounts -----------
  // Shown on the screen before members match each box to a real account.
  bankRule: "Open all your personal checking accounts at the same bank, so transfers land instantly and you see the whole system on one screen. Business checking can be at a different bank.",
  bizBankRule: "Open all your business checking accounts at the same bank, so transfers land instantly and you see the whole business on one screen. It can be a different bank from your personal accounts.",

};
