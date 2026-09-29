// ============================================================
//  Money Flywheel Mapper — the questions and the map rules
//  Everything here is plain, reviewable logic. No AI decides anything.
//
//  Scope: this tool has ONE job, showing a member the accounts in their
//  Money Flywheel and how money flows between them. Which goal to fund
//  first (the Financial Goal Selector) and how to wire transfers and
//  direct deposits (the Cashflow Planner) are separate tools.
//
//  Steady income runs through the Hub. Occasional income appears as a
//  dashed pill with no arrow; routing it is the Cashflow Planner's job.
// ============================================================
(function () {
  const C = window.MAPPER_CONFIG;

  // ---------------------------------------------------------
  //  QUESTIONS
  //  Two answers decide the layout: how you earn, and whether you share
  //  money with a partner. That gives six possible maps. The two
  //  "steady?" questions only change where one income pill connects.
  //  Names personalize the title and the Spending labels.
  // ---------------------------------------------------------
  const QUESTIONS = [
    {
      id: "name",
      section: "You",
      type: "names",
      required: true,
      q: "What's your name?",
      // First name goes on the map. Last name is stored with the answers and never shown;
      // it is there for Rose's own follow-up later.
      fields: [
        { id: "name", placeholder: "First name", label: "First name" },
        { id: "last_name", placeholder: "Last name", label: "Last name" },
      ],
    },
    {
      id: "work",
      section: "How you earn",
      q: "How do you earn your money?",
      help: "This decides whether your map needs a business side.",
      options: [
        { v: "employee", t: "I'm employed by a company", s: "W-2 paycheck" },
        { v: "self", t: "I'm self-employed", s: "Freelance, 1099, or my own business" },
        { v: "both", t: "Both", s: "A job plus my own business or side hustle" },
      ],
    },
    {
      id: "side_steady",
      section: "How you earn",
      when: (a) => a.work === "both",
      q: "Does your business or side hustle make enough to pay yourself something from it every month?",
      options: [
        { v: "yes", t: "Yes" },
        { v: "no", t: "Not yet" },
      ],
    },
    {
      id: "partner",
      section: "Your household",
      q: "Do you share money with a partner?",
      // "none" and "separate" both get the single-person flywheel. The answer is kept
      // apart so the two cases stay distinguishable in the saved answers.
      options: [
        { v: "none", t: "No, I don't have a partner right now." },
        { v: "separate", t: "No, I have a partner but we keep our accounts separate." },
        { v: "shared", t: "Yes, I have a partner and we share some or all of our accounts." },
      ],
    },
    {
      id: "partner_name",
      section: "Your household",
      type: "text",
      required: true,
      when: (a) => a.partner === "shared",
      q: (a) => `What's your partner's first name?`,
      placeholder: "Partner's first name",
    },
    {
      id: "partner_income",
      section: "Your household",
      when: (a) => a.partner === "shared",
      q: (a) => `Does ${partnerName(a) || "your partner"} contribute income to your shared accounts every month?`,
      // Size is the test, not steadiness: a freelancing partner pays themselves a steady
      // amount into the household just as a business owner does.
      options: [
        { v: "steady", t: "Yes" },
        { v: "irregular", t: "Sometimes, or small amounts" },
        { v: "none", t: "No income right now" },
      ],
    },
  ];

  // ---------------------------------------------------------
  //  HELPERS
  // ---------------------------------------------------------
  const trim = (s) => (s || "").trim();
  const partnerName = (a) => (a.partner === "shared" ? trim(a.partner_name) : "");
  // "Rose" -> "Rose's", "James" -> "James'", "Rose & Sam" -> "Rose & Sam's"
  function possessive(name) {
    const n = trim(name);
    if (!n) return "";
    return /s$/i.test(n) ? `${n}'` : `${n}'s`;
  }
  function mapTitle(a) {
    const you = trim(a.name);
    const them = partnerName(a);
    const who = you && them ? `${you} & ${them}` : you || (them ? `You & ${them}` : "");
    const p = possessive(who);
    return p ? `${p} Money Flywheel Map` : "Your Money Flywheel Map";
  }

  // ---------------------------------------------------------
  //  RESULT: the accounts on the map, in flow order
  //  incomes[].to  "bizhub" | "hub" | "later"   (later = occasional, not wired yet)
  // ---------------------------------------------------------
  function buildResult(a) {
    const L = C.links;
    const isEmp = a.work === "employee" || a.work === "both";
    const runsBusiness = a.work === "self" || (a.work === "both" && a.side_steady === "yes");
    const sideIrregular = a.work === "both" && a.side_steady === "no";
    const shared = a.partner === "shared";
    const you = trim(a.name);
    const them = partnerName(a);
    const theirs = them ? possessive(them) : "Partner's";

    // -- Income sources (the pills at the top) --
    const incomes = [];
    if (runsBusiness) incomes.push({ id: "revenue", name: "Revenue", type: "Client payments", to: "bizhub" });
    if (isEmp) incomes.push({ id: "paycheck", name: shared ? "Your paycheck" : "Paycheck", type: "Employer", to: "hub" });
    if (shared && a.partner_income === "steady") incomes.push({ id: "paycheck2", name: `${theirs} income`, type: "Paycheck or business", to: "hub" });
    // Occasional income is on the map as a dashed pill with no arrow. Where it goes is
    // the Cashflow Planner's decision, not this tool's.
    if (sideIrregular) incomes.push({ id: "side", name: "Side hustle", to: "later" });
    if (shared && a.partner_income === "irregular") incomes.push({ id: "paycheck2", name: `${theirs} income`, to: "later" });

    // -- Business side (steady business income only) --
    const biz = [];
    if (runsBusiness) {
      biz.push({ id: "bizhub", name: "Biz Hub", type: "Business checking", link: L.bizChecking,
        note: "Every client payment lands here. A share goes to Taxes, business costs are paid from here, and the rest pays you." });
      biz.push({ id: "taxes", name: "Taxes", type: "Business checking", link: L.bizChecking,
        note: "A fixed share of every payment is set aside here. This is the money that never feels like yours." });
    }

    // -- Personal side: the Hub and the buckets --
    const hub = { id: "hub", name: shared ? "Household Hub" : "Personal Hub", type: "Checking", link: L.checking,
      note: "Steady income lands here, gets split into the accounts below, and the Hub reads $0 again." };

    const buckets = [];
    buckets.push({ id: "bills", name: "Bills", type: "Checking", link: L.checking,
      note: "Rent or mortgage, utilities, insurance, subscriptions, minimum debt payments. Everything on autopay from here." });
    if (shared) {
      buckets.push({ id: "spending", name: `Spending · ${you || "You"}`, type: "Checking", link: L.checking,
        note: "Your guilt-free money, in your own name. Whatever is in here is yours to spend, no questions." });
      buckets.push({ id: "spending2", name: `Spending · ${them || "Partner"}`, type: "Checking", link: L.checking,
        note: `${them ? theirs : "Your partner's"} guilt-free money, in their own name. Same rules, separate card.` });
    } else {
      buckets.push({ id: "spending", name: "Spending", type: "Checking", link: L.checking,
        note: "Groceries, dinners, fun. Whatever is in here is yours to spend, 100% guilt-free." });
    }
    buckets.push({ id: "upcoming", name: "Upcoming", type: "Checking", link: L.checking,
      note: "Known-ish costs on the horizon: travel, gifts, car repairs, annual fees. Funded a little at a time." });
    buckets.push({ id: "goals", name: "Financial Goals", type: "Checking", link: L.checking,
      note: "Gets its share from the Hub and sends it to the one goal you are on right now. Which goal is the Financial Goal Selector's job." });

    return {
      answers: a,
      title: mapTitle(a),
      incomes,
      biz,
      hub,
      buckets,
      accounts: [...biz, hub, ...buckets],
      shared,
      runsBusiness,
      isEmp,
    };
  }

  window.MAPPER_TREE = { QUESTIONS, buildResult, mapTitle };
})();
