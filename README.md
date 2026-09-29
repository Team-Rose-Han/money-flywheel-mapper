# Money Flywheel Mapper

A members-only tool for the 30 Minute Money community. Members answer three to
six questions and get their personalized map: the accounts in their Money Flywheel,
how money flows between them, and a checklist of accounts to open.

Static site: no server, no database, no monthly cost beyond hosting.

## One job

Setting up the money system is three separate actions, and each gets its own tool:

| Tool | Job | Status |
|---|---|---|
| **Money Flywheel Mapper** (this folder) | Which accounts to open, and the map of how money flows between them | Built |
| **Cashflow Planner** | Starting balances, recurring transfers, direct deposits, autopays, payday timing | Next |
| **Financial Goal Selector** | The one goal the Financial Goals account funds right now | Next |

The Mapper deliberately says nothing about goals, amounts, or timing. Every map
ends in a single **Financial Goals** account (high-yield savings). What it funds
is the Goal Selector's job. How money gets into it is the Cashflow Planner's job.

## The flow, one screen at a time

1. **Questions.** Three to six, with Back. Just the question and its options: the
   tool does not teach what each account is for, the live training does.
2. **Your map.** The personalized map is revealed once, with Back and Continue.
   Arrows show the direction of money flow.
3. **The one bank.** "Which one bank will hold all of your personal checking
   accounts (joint and individual)?" with the same-bank rule under it. Business
   owners then answer the same for business checking, with its own rule callout.
   Both rules are editable in `config.js` (`bankRule`, `bizBankRule`).
4. **Final map.** Every box shows that bank's name with a four-digit field beside it.
   Members type only the last four digits, so a different bank cannot be entered and
   the rule holds by construction. "4789" prints as "Capital One 4789"; an empty
   field prints "Open new · Capital One" in coral. Blank boxes are the to-do list:
   members open those accounts, come back (the map is saved in their browser), fill
   in the digits, and download the finished map from the top-right corner.

Answers (including last name), the bank and the account labels are saved in the
member's browser only.

## The questions

1. What's your name? First and last, both required. The first name personalizes the
   title and your Spending label. The last name is stored with the answers and never
   shown anywhere (kept for Rose's own follow-up).
2. How do you earn your money? I'm employed by a company / I'm self-employed / Both
3. Does your business or side hustle make enough to pay yourself something from it
   every month? (only for Both) Yes / Not yet
4. Do you share money with a partner? No, I don't have a partner right now / No, I
   have a partner but we keep our accounts separate / Yes, I have a partner and we
   share some or all of our accounts. The first two get the single-person flywheel.
5. What's your partner's first name? (only if shared; required)
6. Does your partner contribute income to your shared accounts every month? (only if
   shared) Yes / Sometimes, or small amounts / No income right now

Solo employees answer three. The most branching case answers six. Then one bank
question (two for business owners), and the final map.

## Occasional income

Steady income runs through the Hub. Income that is only occasional (a side hustle too
small to pay yourself from, a partner who contributes sometimes) appears on the map as
a dashed pill in the income row with no arrow. Where that money goes is the Cashflow
Planner's decision, not this tool's.

## The six maps

Two answers decide the layout: how you earn (employee, self-employed, both) and
whether you share accounts with a partner (no, or yes). The "steady?" questions only
change where one income pill connects. The maps have no package names yet; the
title is "<Name>'s Money Flywheel Map".

Every map has: income pill(s) → Hub → Bills, Spending, Upcoming, Financial Goals.
Each box shows the account name and, under it, the account type (all Checking for
now; the label is there for the savings and investment accounts later weeks add).
The final map adds the member's real account under that.

- **Self-employed** (or a steady side business) adds the business side: Revenue →
  Biz Hub → Taxes, with a "Pay yourself" arrow into the personal Hub. Business costs
  are paid from the Biz Hub. A later iteration will ask about entity type (sole
  proprietor, LLC, S-Corp) and add granularity here.
- **Shared finances** turns the Hub into a Household Hub, adds the partner's income
  pill, and gives each partner their own Spending account in their own name. Bills,
  Upcoming and Financial Goals are shared. Both kinds of couple get the same
  accounts; the arrows differ. **Pool everything:** both Spending accounts are fed
  from the Household Hub. **Yours, mine, and ours:** each partner's paycheck drops
  straight into their own Spending (drawn on the outside of the row) and the rest
  goes to the Hub. A partner whose income is irregular or absent has their Spending
  fed from the Hub either way.

## Files

| File | What it is | Who edits it |
|---|---|---|
| `config.js` | Access code, allowed embed hosts, the same-bank rule, "where to open" links | Rose's team |
| `tree.js` | The questions, the accounts and their one-line jobs | Rose + Cez |
| `app.js` | The screen: question flow, map drawing, checklist, PNG export | Cez |
| `styles.css` | Look and feel (white / navy / coral, Poppins + Lato) | Cez |
| `logo.png` | The 30 Minute Money logo, shown beside the tool name in the header and on the gate | Rose's team |
| `index.html` | Page shell | Cez |

## Deploy (about five minutes, no code)

1. Go to https://app.netlify.com/drop and drag this whole folder onto the page.
2. Netlify gives you a URL like `https://something.netlify.app`. Rename the site
   in Site settings so the URL reads well, or add a custom domain such as
   `tools.rosehan.com` (Domain management → Add domain, then one CNAME record).
3. Every later change: drag the folder again, or connect the folder to a Git repo.

Cloudflare Pages and Vercel work the same way if you prefer them.

## Put it inside Circle (custom page)

1. In Circle, create a Page (Site → Pages, or the Pages section of the space) and
   add an **HTML** block.
2. Paste this, with your real URL:

```html
<div style="max-width:1180px;margin:0 auto">
  <iframe id="mapper" src="https://YOUR-URL-HERE/" title="Money Flywheel Mapper"
    style="width:100%;height:1400px;border:0;border-radius:16px;background:#ede9e4"
    allow="clipboard-write" loading="lazy"></iframe>
</div>
<script>
  window.addEventListener("message", function (e) {
    if (e.data && e.data.mapperHeight) {
      document.getElementById("mapper").style.height = (e.data.mapperHeight + 40) + "px";
    }
  });
</script>
<p style="font-size:13px;color:#6b6661">On the phone app, or if the tool doesn't load,
  <a href="https://YOUR-URL-HERE/" target="_blank" rel="noopener">open it full screen</a>
  and use the access code <b>FREEDOM</b>.</p>
```

If Circle strips the `<script>` part, the iframe keeps a fixed height and scrolls
inside itself; raise the `height` value if the bottom of the checklist is cut off.

3. Restrict the page to the spaces or access groups that should see it.

## How the gate works

- Inside Circle, the tool sees it is embedded on an allowed host
  (`allowedEmbedHosts` in `config.js`) and asks for nothing.
- Opened directly (phone app, copied link), it asks for the access code once and
  remembers the unlock in that browser.
- The page is marked `noindex`, so search engines never list it.
- To change the code, run `printf 'NEWCODE' | shasum -a 256` in Terminal and paste
  the result into `accessCodeHash`. Use capital letters in NEWCODE.

## Things to review with Rose

- **Package names**: none yet. When Rose names the six maps, they go in `tree.js`.
- **Financial Goals** is the only goal-side account on the map, typed as Checking
  because it passes money on to whatever the current goal is. Emergency fund,
  Roth IRA, 401(k), HSA and the rest are the Goal Selector's business.
- **Side-hustle taxes.** An unsteady side hustle gets no Taxes account on the map.
  Self-employment tax still applies once it nets a few hundred dollars a year;
  where that set-aside lives is a Cashflow Planner question.
- **Spending for couples** is always two accounts, each in one partner's own name,
  even for couples who pool everything. That way nothing has to be reopened once
  the Cashflow Planner decides how the accounts are fed.
- The `links` in `config.js` (personal checking, business checking) appear as a
  "recommended banks" link on the matching bank screen once a url is filled in.
