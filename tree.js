// ============================================================
//  Money Flywheel Mapper — the decision tree and the rules
//  Everything here is plain, reviewable logic. No AI decides anything.
// ============================================================
(function () {
  const C = window.MAPPER_CONFIG;
  const fmt = (n) => "$" + n.toLocaleString("en-US");

  // ---------------------------------------------------------
  //  QUESTIONS
  //  `when(a)` decides whether a question is asked, given answers so far.
  //  Waterfall questions are only asked while every earlier step is done,
  //  so most people answer 8 to 10 questions, not 17.
  // ---------------------------------------------------------
  const QUESTIONS = [
    {
      id: "work",
      section: "How you earn",
      q: "How do you earn your money?",
      help: "This decides whether you need a business side to your system.",
      options: [
        { v: "employee", t: "I'm employed by a company", s: "W-2 paycheck" },
        { v: "self", t: "I'm self-employed", s: "Freelance, 1099, or my own business" },
        { v: "both", t: "Both", s: "A job plus a side business" },
      ],
    },
    {
      id: "employer_plan",
      section: "How you earn",
      when: (a) => a.work === "employee" || a.work === "both",
      q: "Does your job offer a retirement plan like a 401(k), 403(b), or TSP?",
      options: [
        { v: "match", t: "Yes, with an employer match" },
        { v: "nomatch", t: "Yes, but no match" },
        { v: "none", t: "No plan at work" },
      ],
    },
    {
      id: "employees",
      section: "How you earn",
      when: (a) => a.work === "self" || a.work === "both",
      q: "Does your business have employees other than you (and your spouse)?",
      help: "Employees change which retirement account your business can use.",
      options: [
        { v: "no", t: "No, it's just me" },
        { v: "yes", t: "Yes, I have employees" },
      ],
    },
    {
      id: "partner",
      section: "Your household",
      q: "Do you share money with a partner?",
      options: [
        { v: "solo", t: "Just me" },
        { v: "joint", t: "Yes, we pool everything" },
        { v: "hybrid", t: "Yes, but we keep some money separate", s: "Yours, mine, and ours" },
      ],
    },
    {
      id: "filing",
      section: "Your household",
      q: "How do you file your taxes?",
      options: [
        { v: "single", t: "Single or head of household" },
        { v: "mfj", t: "Married, filing jointly" },
      ],
    },
    {
      id: "income",
      section: "Your household",
      q: (a) =>
        a.filing === "mfj"
          ? "Roughly what is your combined household income?"
          : "Roughly what is your gross income?",
      help: (a) => {
        const lim = a.filing === "mfj" ? C.rothPhaseoutStart.mfj : C.rothPhaseoutStart.single;
        return `Above about ${fmt(lim)} (${C.taxYear}), a regular Roth IRA starts to close and you use the Backdoor Roth instead.`;
      },
      options: (a) => {
        const lim = a.filing === "mfj" ? C.rothPhaseoutStart.mfj : C.rothPhaseoutStart.single;
        return [
          { v: "under", t: `Under ${fmt(lim)}` },
          { v: "over", t: `${fmt(lim)} or more` },
        ];
      },
    },
    {
      id: "hdhp",
      section: "Your household",
      q: "Is your health insurance a high-deductible health plan (HDHP)?",
      help: "Only an HDHP lets you open a Health Savings Account. Your insurance card or benefits page says so.",
      options: [
        { v: "yes", t: "Yes" },
        { v: "no", t: "No" },
        { v: "unsure", t: "Not sure" },
      ],
    },
    {
      id: "big_goal",
      section: "Your dreams",
      q: "Once your retirement accounts are maxed, what does your Dream Fund go toward?",
      help: "This is step 9 of the Waterfall. It waits its turn, but naming it now puts it on your map.",
      options: [
        { v: "invest", t: "Invest to grow wealth", s: "Taxable brokerage account" },
        { v: "house", t: "Buy a home", s: "Down payment fund" },
        { v: "college", t: "A child's education", s: "529 college plan" },
        { v: "dream", t: "A bucket-list dream", s: "A sabbatical, a big trip, a boat" },
      ],
    },
    {
      id: "dream",
      section: "Your dreams",
      type: "text",
      q: (a) => ({ invest: "Give this goal a name", house: "What's the home?", college: "Whose education?", dream: "What's the dream?" }[a.big_goal] || "Name your dream"),
      help: "This becomes the label on your Dream Fund. Optional.",
      placeholder: (a) => ({ invest: "e.g. Work optional by 45", house: "e.g. A condo near the beach", college: "e.g. Mia's college fund", dream: "e.g. Sailing around the world" }[a.big_goal] || ""),
    },

    // ---- The Financial Waterfall, asked top-down --------------
    {
      id: "efund",
      section: "Where you are",
      q: "How much cash could you tap in an emergency today?",
      options: [
        { v: "under", t: `Less than ${fmt(C.starterEmergencyFund)}` },
        { v: "some", t: `${fmt(C.starterEmergencyFund)} to under ${C.emergencyMonths} months of expenses` },
        { v: "full", t: `${C.emergencyMonths}+ months of expenses` },
      ],
    },
    {
      id: "cc",
      section: "Where you are",
      when: (a) => a.efund !== "under",
      q: "Do you carry a credit card balance from month to month?",
      help: "A card you pay off in full every month is not debt.",
      options: [
        { v: "no", t: "No, I pay in full" },
        { v: "yes", t: "Yes, I carry a balance" },
      ],
    },
    {
      id: "match_full",
      section: "Where you are",
      when: (a) => a.efund !== "under" && a.cc === "no" && a.employer_plan === "match",
      q: "Are you contributing enough to get your full employer match?",
      options: [
        { v: "yes", t: "Yes, I get the full match" },
        { v: "no", t: "No, or I'm not sure" },
      ],
    },
    {
      id: "roth_maxed",
      section: "Where you are",
      when: (a) => stepBefore(a, 5),
      q: (a) => `Have you maxed out your ${rothName(a)} this year?`,
      options: [
        { v: "yes", t: "Yes, maxed" },
        { v: "no", t: "Not yet" },
      ],
    },
    {
      id: "hsa_maxed",
      section: "Where you are",
      when: (a) => stepBefore(a, 6) && a.hdhp === "yes",
      q: "Have you maxed out your HSA this year?",
      options: [
        { v: "yes", t: "Yes, maxed" },
        { v: "no", t: "Not yet" },
      ],
    },
    {
      id: "ret_maxed",
      section: "Where you are",
      when: (a) => stepBefore(a, 7) && bigRetirementName(a) !== null,
      q: (a) => `Have you maxed out your ${bigRetirementName(a)} this year?`,
      options: [
        { v: "yes", t: "Yes, maxed" },
        { v: "no", t: "Not yet" },
      ],
    },
    {
      id: "other_debt",
      section: "Where you are",
      when: (a) => stepBefore(a, 8),
      q: "Do you have any other debt besides a mortgage?",
      help: "Car loans, student loans, personal loans, buy-now-pay-later.",
      options: [
        { v: "no", t: "No other debt" },
        { v: "yes", t: "Yes" },
      ],
    },
    {
      id: "mortgage",
      section: "Where you are",
      when: (a) => stepBefore(a, 9),
      q: "Do you have a mortgage?",
      options: [
        { v: "no", t: "No" },
        { v: "yes", t: "Yes" },
      ],
    },
    {
      id: "goal_on_track",
      section: "Where you are",
      when: (a) => stepBefore(a, 9) && a.mortgage === "yes",
      q: (a) => `Are you already funding your ${goalAccountShort(a)} every payday?`,
      options: [
        { v: "no", t: "Not yet" },
        { v: "yes", t: "Yes, on autopilot" },
      ],
    },
  ];

  // ---------------------------------------------------------
  //  HELPERS used by both questions and results
  // ---------------------------------------------------------
  function aboveRothLimit(a) {
    return a.income === "over";
  }
  function rothName(a) {
    return aboveRothLimit(a) ? "Backdoor Roth IRA" : "Roth IRA";
  }
  function hasEmployerPlan(a) {
    return (a.work === "employee" || a.work === "both") && (a.employer_plan === "match" || a.employer_plan === "nomatch");
  }
  function selfPlanName(a) {
    if (a.work !== "self" && a.work !== "both") return null;
    return a.employees === "yes" ? "SEP IRA" : "Solo 401(k)";
  }
  // The "big" retirement account for step 7.
  function bigRetirementName(a) {
    const parts = [];
    if (hasEmployerPlan(a)) parts.push("401(k)");
    const s = selfPlanName(a);
    if (s) parts.push(s);
    return parts.length ? parts.join(" and ") : null;
  }
  function goalAccountShort(a) {
    return "Dream Fund";
  }

  // True when every waterfall step before `n` is complete, given answers so far.
  // Unanswered questions count as "not done", which stops later questions from appearing.
  function stepBefore(a, n) {
    return currentStep(a).step >= n;
  }

  // ---------------------------------------------------------
  //  THE FINANCIAL WATERFALL (Rose's 10 steps)
  // ---------------------------------------------------------
  const WATERFALL = [
    null,
    {
      title: "Save a $2,000 starter emergency fund",
      account: "efund",
      why: "Before anything else, put a $2,000 buffer between you and the next surprise. It is what turns an emergency into a speed bump instead of a reset.",
      action: "Open a high-yield savings account, nickname it Emergency Fund, and point your Financial Goal bucket at it until it reads $2,000.",
    },
    {
      title: "Pay off ALL credit card debt",
      account: "cards",
      why: "Credit card interest beats any return you could earn by investing. Clearing it is the highest-return move available to you.",
      action: "Every dollar left after Bills, Spending and Upcoming goes to the highest-interest card first. Your Financial Goal bucket points at your cards until they read $0.",
    },
    {
      title: "Max out your 401(k) employer match",
      account: "employer",
      why: "A match is an instant 50 to 100 percent return on every dollar you put in. Nothing else in your system pays like that.",
      action: "Log in to your workplace plan and raise your contribution to whatever earns the full match.",
    },
    {
      title: "Save a 6-month full emergency fund",
      account: "efund",
      why: "Now build the real safety net: six months of Bills plus Spending, so a layoff or a bad quarter never touches your investments.",
      action: "Keep funding the same high-yield savings account every payday until it holds six months of essentials.",
    },
    {
      title: "Max out your Roth IRA",
      account: "roth",
      why: "Money in a Roth grows and comes out tax-free in retirement. It is the most flexible retirement account you will own.",
      action: "Open the account at a brokerage, set an automatic transfer from your Financial Goal bucket, and fund it to the annual limit.",
    },
    {
      title: "Max out your HSA",
      account: "hsa",
      why: "An HSA is triple tax-free: money goes in untaxed, grows untaxed, and comes out untaxed for medical costs. It doubles as a retirement account.",
      action: "Contribute through payroll if you can, invest the balance instead of leaving it in cash, and pay small medical bills from Spending.",
    },
    {
      title: "Max out your 401(k), Solo 401(k) or SEP IRA",
      account: "big_retirement",
      why: "With the match, the Roth and the HSA handled, the big retirement account is where the compounding machine really runs.",
      action: "Raise your contribution rate until you hit the annual limit. Every raise from here goes to this account first.",
    },
    {
      title: "Pay off ALL other debt (except your mortgage)",
      account: "debt",
      why: "Car loans, student loans and personal loans are a drag on cash flow. With retirement funded, clearing them buys freedom.",
      action: "Point your Financial Goal bucket at the highest-interest loan and roll each payment into the next one as it clears.",
    },
    {
      title: "Fund your Dream Fund",
      account: "dream",
      why: "Every tax-advantaged account is maxed for the year. Now the Waterfall pours into the dream itself: a taxable brokerage, a home, a child's education, or the trip you have been putting off.",
      action: "Open the account that matches your dream and automate a transfer from your Financial Goal bucket every payday until it is funded.",
    },
    {
      title: "Pay off your mortgage early",
      account: "mortgage",
      why: "The last step. With everything else on autopilot, extra principal payments buy a home that is fully yours.",
      action: "Add a set amount to your mortgage payment each month and mark it as principal.",
    },
  ];

  function currentStep(a) {
    if (a.efund === undefined || a.efund === "under") return { step: 1, sure: a.efund !== undefined };
    if (a.cc === undefined || a.cc === "yes") return { step: 2, sure: a.cc !== undefined };
    if (a.employer_plan === "match") {
      if (a.match_full === undefined || a.match_full === "no") return { step: 3, sure: a.match_full !== undefined };
    }
    if (a.efund !== "full") return { step: 4, sure: true };
    if (a.roth_maxed === undefined || a.roth_maxed === "no") return { step: 5, sure: a.roth_maxed !== undefined };
    if (a.hdhp === "yes") {
      if (a.hsa_maxed === undefined || a.hsa_maxed === "no") return { step: 6, sure: a.hsa_maxed !== undefined };
    }
    if (bigRetirementName(a) !== null) {
      if (a.ret_maxed === undefined || a.ret_maxed === "no") return { step: 7, sure: a.ret_maxed !== undefined };
    }
    if (a.other_debt === undefined || a.other_debt === "yes") return { step: 8, sure: a.other_debt !== undefined };
    if (a.mortgage === undefined) return { step: 9, sure: false };
    if (a.mortgage === "yes") {
      if (a.goal_on_track === undefined || a.goal_on_track === "no") return { step: 9, sure: a.goal_on_track !== undefined };
      return { step: 10, sure: true };
    }
    return { step: 9, sure: true };
  }

  // ---------------------------------------------------------
  //  ACCOUNT COMBO (Rose's four packages, plus one for "both")
  // ---------------------------------------------------------
  function comboName(a) {
    if (a.work === "self") return a.employees === "yes" ? "The Freelancer Flex" : "The Solopreneur Special";
    if (a.work === "both") return "The Side-Hustle Stack";
    return aboveRothLimit(a) ? "The High-Roller Package" : "The Employee Express";
  }

  // ---------------------------------------------------------
  //  RESULT: the accounts on the map and their state
  //  state: "goal" = fund this now, "active" = open and on autopilot,
  //         "later" = open when you reach that step
  // ---------------------------------------------------------
  function buildResult(a) {
    const L = C.links;
    const cur = currentStep(a);
    const step = cur.step;
    const isSelf = a.work === "self" || a.work === "both";
    const isEmp = a.work === "employee" || a.work === "both";
    const shared = a.partner === "joint" || a.partner === "hybrid";
    const stateFor = (n) => (n === step ? "goal" : n < step ? "active" : "later");

    // -- Cash-flow accounts (always open now) --
    const flow = [];
    if (isSelf) {
      flow.push({ id: "bizhub", name: "Biz Hub", type: "Business checking", link: L.checking, state: "active",
        note: "Every client payment lands here first. Split it into Taxes and Expenses, then pay yourself." });
      flow.push({ id: "taxes", name: "Taxes", type: "Business savings", link: L.hysa, state: "active",
        note: "Set aside a fixed share of every payment. This is the money that never feels like yours." });
      flow.push({ id: "expenses", name: "Expenses", type: "Business checking", link: L.checking, state: "active",
        note: "Software, gear, contractors. Business spending never touches your personal accounts." });
    }
    flow.push({ id: "hub", name: shared ? "Household Hub" : "Personal Hub", type: "Checking", link: L.checking, state: "active",
      note: "Every payday lands here, gets split into the buckets below, and the Hub reads $0 again." });
    flow.push({ id: "bills", name: "Bills", type: "Checking", link: L.checking, state: "active",
      note: "Rent, utilities, insurance, subscriptions, minimum debt payments. Everything on autopay from here." });
    if (shared) {
      flow.push({ id: "spending", name: "Spending · You", type: "Checking + debit card", link: L.checking, state: "active",
        note: "Your guilt-free money. Whatever is in here is yours to spend, no questions." });
      flow.push({ id: "spending2", name: "Spending · Partner", type: "Checking + debit card", link: L.checking, state: "active",
        note: "Your partner's own guilt-free money. Same rules, separate card." });
    } else {
      flow.push({ id: "spending", name: "Spending", type: "Checking + debit card", link: L.checking, state: "active",
        note: "Groceries, dinners, fun. Whatever is in here is yours to spend, 100% guilt-free." });
    }
    flow.push({ id: "upcoming", name: "Upcoming", type: "Savings", link: L.hysa, state: "active",
      note: "Known-ish costs on the horizon: travel, gifts, car repairs, annual fees. Funded a little every payday." });

    // -- Goal accounts (the right-hand stack), each tied to a waterfall step --
    const stack = [];
    const efundState = step === 1 || step === 4 ? "goal" : step > 4 ? "active" : "active";
    stack.push({ id: "efund", name: "Emergency Fund", type: "High-yield savings", link: L.hysa, step: step <= 1 ? 1 : 4, state: efundState,
      note: step <= 1 ? "First $2,000, then six months of essentials." : "Six months of Bills plus Spending, untouched." });

    if (isEmp && hasEmployerPlan(a)) {
      const n = a.employer_plan === "match" ? 3 : 7;
      const st = a.employer_plan === "match"
        ? (step === 3 || step === 7 ? "goal" : step < 3 ? "later" : "active")
        : stateFor(7);
      stack.push({ id: "employer", name: "401(k)", type: "Workplace plan", link: null, step: n, state: st,
        note: a.employer_plan === "match" ? "Contribute enough for the full match, then max it at step 7." : "Max this at step 7." });
    }
    stack.push({ id: "roth", name: rothName(a), type: "Retirement, at a brokerage", link: L.roth, step: 5, state: stateFor(5),
      note: aboveRothLimit(a) ? "Contribute to a Traditional IRA, then convert to Roth. Your income is above the direct limit." : "Tax-free growth. Fund it every payday from the Financial Goal bucket." });
    if (a.hdhp === "yes" || a.hdhp === "unsure") {
      stack.push({ id: "hsa", name: a.hdhp === "unsure" ? "HSA (if eligible)" : "HSA", type: "Health savings account", link: L.hsa, step: 6,
        state: a.hdhp === "unsure" ? (step > 6 ? "active" : "later") : stateFor(6),
        note: a.hdhp === "unsure" ? "Only if your plan is an HDHP. Check your benefits page." : "Triple tax-free. Invest the balance." });
    }
    if (isSelf) {
      const nm = selfPlanName(a);
      stack.push({ id: "selfplan", name: nm, type: "Self-employed retirement", link: nm === "SEP IRA" ? L.sepIra : L.solo401k, step: 7, state: stateFor(7),
        note: nm === "SEP IRA" ? "Works with employees. Contributions come from the business." : "For a business of one. Highest contribution room." });
    }
    // Step 9 is the Dream Fund step. One account, shaped by what the dream is.
    const dreamKinds = {
      invest:  { type: "Taxable brokerage", link: L.brokerage, note: "Invest for the life you actually want, once every tax-advantaged account is maxed." },
      house:   { type: "High-yield savings for a down payment", link: L.hysa, note: "Your down payment, saved in cash so the market can't move it right before you buy." },
      college: { type: "529 college plan", link: L.plan529, note: "Tax-free growth for education. Funded after your own retirement, never before." },
      dream:   { type: "High-yield savings", link: L.hysa, note: "The bucket-list dream. It waits its turn in the Waterfall, then gets every Financial Goal dollar." },
    };
    const dk = dreamKinds[a.big_goal] || dreamKinds.invest;
    const dreamLabel = (a.dream || "").trim();
    stack.push({ id: "dream", name: "Dream Fund", type: dreamLabel ? `${dreamLabel} · ${dk.type}` : dk.type, link: dk.link, step: 9, state: stateFor(9), note: dk.note });

    // Non-account goals (steps 2, 8, 10) point the Financial Goal bucket somewhere that already exists.
    const goalTargets = { 2: "Your credit cards", 8: "Your loans", 10: "Your mortgage" };

    const w = WATERFALL[step];
    const goalAccount = stack.find((s) => s.state === "goal");
    return {
      answers: a,
      combo: comboName(a),
      step,
      stepSure: cur.sure,
      stepTitle: w.title.replace("Roth IRA", rothName(a)).replace("401(k), Solo 401(k) or SEP IRA", bigRetirementName(a) || "401(k)"),
      stepWhy: w.why,
      stepAction: w.action,
      goalTarget: goalAccount ? goalAccount.name : goalTargets[step] || "",
      flow,
      stack,
      shared,
      hybrid: a.partner === "hybrid",
      isSelf,
      isEmp,
    };
  }

  window.MAPPER_TREE = { QUESTIONS, WATERFALL, currentStep, buildResult, comboName };
})();
