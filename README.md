# Money Flywheel Mapper

A members-only tool for the 30 Minute Money community. Members answer about nine
questions and get their Account Combo, a map of how money flows between their
accounts, the one Financial Waterfall goal to fund right now, and a checklist of
accounts to open.

Static site: no server, no database, no monthly cost beyond hosting.

## Files

| File | What it is | Who edits it |
|---|---|---|
| `config.js` | Access code, allowed embed hosts, tax-year thresholds, "where to open" links | Rose's team |
| `tree.js` | The questions, the branch logic, the 10 Waterfall steps and their copy, the account rules | Rose + Cez |
| `app.js` | The screen: question flow, map drawing, results, PNG export | Cez |
| `styles.css` | Look and feel (cream / navy / coral, Poppins + Lato) | Cez |
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
    style="width:100%;height:1600px;border:0;border-radius:16px;background:#ede9e4"
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

- **"The Side-Hustle Stack"** is a placeholder name for people with a job *and* a
  business. The four original combo names are unchanged.
- **Joint finances** render as one Household Hub with shared Bills and Upcoming and
  a separate Spending account per partner. "Yours, mine and ours" shows the same map
  with the partner's pill labelled as their contribution to the Hub.
- **No workplace plan**: step 3 is skipped and step 7 only covers accounts the
  person actually has.
- **Roth income thresholds** live in `config.js` and must be checked each January.
- The **Dream Fund** is Waterfall step 9 (brokerage, home, college, or a bucket-list
  dream). It stays dashed until every step before it is maxed for the year or done.
  "Live your bucket list now" is the brand promise, not permission to skip steps.
- **One goal at a time.** The tool walks the Waterfall top-down and stops at the
  first step that is not maxed for the year or fully accomplished. Only that step is
  coral; earlier steps show a check; later steps are dashed.
- Fill the `links` in `config.js` when the affiliate tools hub is ready; empty links
  show "Rose's pick coming soon".
