// Five Bars data helper. Node 20+, no dependencies, no API calls.
//
//   node scripts/deals.mjs prep    back up today's list and download the deal pages to work/sources/
//   node scripts/deals.mjs check   validate site/data/deals.json (Claude runs this to check its own work)
//   node scripts/deals.mjs finish  stamp today's date, validate, write changes.json; restore the backup if invalid

import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const DATA = new URL("site/data/deals.json", root);
const CHANGES = new URL("site/data/changes.json", root);
const WORK = new URL("work/", root);
const PREV = new URL("work/prev.json", root);
const SRC_DIR = new URL("work/sources/", root);

// Pages downloaded every run. Add more here; keep it to pages that list current deals or prices.
// If a page blocks the download, Claude tries it again with its own web tools during the run.
const FEEDS = [
  { name: "PrepaidCompare deals", url: "https://prepaidcompare.net/deals/", what: "Daily list of prepaid promos and free-phone deals" },
  { name: "Clark.com new cell phone deals", url: "https://clark.com/cell-phones/new-cell-phone-deals/", what: "Monthly roundup of new carrier deals" },
  { name: "Clark.com best cell phone plans", url: "https://clark.com/cell-phones/best-cell-phone-plans-deals/", what: "Plan picks and current prices" },
  { name: "BestPhonePlans", url: "https://www.bestphoneplans.net", what: "Plan specs: priority data, hotspot, video quality" },
  { name: "US Mobile family plan guide", url: "https://www.usmobile.com/blog/family-phone-plans/", what: "Multi-line prices at 2 to 5 lines (written by a carrier, so cross-checked)" },
  { name: "US Mobile prepaid plan guide", url: "https://www.usmobile.com/blog/best-prepaid-phone-plans/", what: "Prepaid plan tiers and prices (written by a carrier, so cross-checked)" },
  { name: "Slickdeals cell phone service deals", url: "https://slickdeals.net/deals/cellphone-providers/", what: "Community-spotted carrier deals" },
  { name: "r/NoContract (Reddit)", url: "https://www.reddit.com/r/NoContract/new/.rss", what: "Fresh prepaid deal posts from the community" },
  { name: "Visible deals", url: "https://www.visible.com/m/deals", what: "Visible’s own current offers" },
  { name: "Verizon Prepaid deals", url: "https://www.verizon.com/prepaid/deals/", what: "Verizon Prepaid’s own current offers" },
  { name: "Boost Mobile deals", url: "https://www.boostmobile.com/deals", what: "Boost’s own current offers" },
];

const NETS = ["vzw", "att", "tmo", "multi"];
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
const log = (...a) => console.log("[five-bars]", ...a);

function htmlToText(html) {
  return html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, t) => `${t} (${href})`)
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "’")
    .replace(/&quot;|&ldquo;|&rdquo;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function rssToText(xml) {
  const items = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) || [];
  return items.slice(0, 40).map((it) => {
    const get = (tag) => (it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")) || [])[1] || "";
    const link = (it.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || get("link");
    const date = get("updated") || get("pubDate");
    const body = htmlToText((get("content") || get("description")).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    return `- ${htmlToText(get("title"))} (${date.trim()}) ${link.trim()}\n  ${body.slice(0, 600)}`;
  }).join("\n");
}

async function fetchText(url) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; FiveBarsDealBot/1.0; personal deal tracker)" },
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const body = await r.text();
    const text = /^\s*<\?xml|<rss|<feed/i.test(body) ? rssToText(body) : htmlToText(body);
    return text.slice(0, 25000);
  } catch (e) {
    log("Could not fetch", url, "-", e.message);
    return null;
  }
}

function validate(d, prev) {
  const errs = [];
  const isNum = (v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi;
  const isUrl = (v) => typeof v === "string" && /^https:\/\//.test(v);
  const isDate = (v) => v == null || /^\d{4}-\d{2}-\d{2}$/.test(v);
  const ids = new Set();
  if (!d || !Array.isArray(d.plans) || !Array.isArray(d.phones)) return ["Missing plans or phones array"];

  d.plans.forEach((p, i) => {
    const at = `plans[${i}] ${p && p.id}`;
    if (!p || typeof p.id !== "string" || !/^[a-z0-9-]+$/.test(p.id)) return errs.push(at + ": bad id");
    if (ids.has(p.id)) errs.push(at + ": duplicate id"); ids.add(p.id);
    if (!p.carrier || !p.plan) errs.push(at + ": missing carrier/plan");
    if (!NETS.includes(p.net)) errs.push(at + ": net must be one of " + NETS.join(", "));
    if (typeof p.unl !== "boolean") errs.push(at + ": unl must be true/false");
    if (!p.unl && typeof p.data !== "string") errs.push(at + ": limited plans need a data string like \"5GB\"");
    if (!isNum(p.price, 0, 200)) errs.push(at + ": bad price");
    if (typeof p.tax !== "boolean") errs.push(at + ": tax must be true/false");
    if (p.maxLines != null && (!Number.isInteger(p.maxLines) || p.maxLines < 1)) errs.push(at + ": maxLines must be a whole number");
    if (p.pri !== null && typeof p.pri !== "boolean") errs.push(at + ": pri must be true, false, or null if unknown");
    if (p.family != null) {
      if (typeof p.family !== "object" || Array.isArray(p.family)) errs.push(at + ": family must be an object like {\"2\": 25, \"4\": 20}");
      else for (const [k, v] of Object.entries(p.family)) {
        if (!["2", "3", "4", "5"].includes(k)) errs.push(at + `: family key "${k}" must be 2, 3, 4 or 5`);
        if (!isNum(v, 0, 200)) errs.push(at + `: family["${k}"] must be a per-line price`);
        if (isNum(v, 0, 200) && isNum(p.price, 0, 200) && v > p.price) errs.push(at + `: family["${k}"] is more than the 1-line price; it should be the per-line price`);
      }
    }
    if (!isUrl(p.url)) errs.push(at + ": url must start with https://");
    if (p.promo) {
      if (!isNum(p.promo.price, 0, 200)) errs.push(at + ": bad promo.price");
      if (!Number.isInteger(p.promo.months) || p.promo.months < 1 || p.promo.months > 60) errs.push(at + ": promo.months must be 1-60");
      if (typeof p.promo.text !== "string") errs.push(at + ": promo.text missing");
      if (p.promo.req != null && !["port", "new"].includes(p.promo.req)) errs.push(at + ": promo.req must be port or new");
      if (!isDate(p.promo.ends)) errs.push(at + ": promo.ends must be YYYY-MM-DD");
    }
  });

  d.phones.forEach((p, i) => {
    const at = `phones[${i}] ${p && p.id}`;
    if (!p || typeof p.id !== "string" || !/^[a-z0-9-]+$/.test(p.id)) return errs.push(at + ": bad id");
    if (ids.has(p.id)) errs.push(at + ": duplicate id"); ids.add(p.id);
    if (!p.carrier || !p.phone) errs.push(at + ": missing carrier/phone");
    if (!["iphone", "android"].includes(p.os)) errs.push(at + ": os must be iphone or android");
    if (!NETS.includes(p.net)) errs.push(at + ": net must be one of " + NETS.join(", "));
    if (!isNum(p.price, 0, 3000)) errs.push(at + ": bad price");
    if (p.planPrice != null && !isNum(p.planPrice, 0, 300)) errs.push(at + ": bad planPrice");
    if (typeof p.port !== "boolean") errs.push(at + ": port must be true/false");
    if (!Number.isInteger(p.lock) || p.lock < 0 || p.lock > 48) errs.push(at + ": lock must be whole months 0-48");
    if (!isUrl(p.url)) errs.push(at + ": url must start with https://");
    if (!isDate(p.ends)) errs.push(at + ": ends must be YYYY-MM-DD");
  });

  // Sanity: a bad run shouldn't wipe out the list.
  if (prev) {
    const minPlans = Math.max(8, Math.floor(prev.plans.length * 0.6));
    const minPhones = Math.max(8, Math.floor(prev.phones.length * 0.5));
    if (d.plans.length < minPlans) errs.push(`Only ${d.plans.length} plans (need at least ${minPlans})`);
    if (d.phones.length < minPhones) errs.push(`Only ${d.phones.length} phone deals (need at least ${minPhones})`);
  }
  if (d.plans.length > 60 || d.phones.length > 80) errs.push("Too many deals; keep the best");
  return errs;
}

function diff(prev, next) {
  const key = (x) => JSON.stringify(x);
  const before = new Map([...prev.plans, ...prev.phones].map((x) => [x.id, key(x)]));
  const after = new Map([...next.plans, ...next.phones].map((x) => [x.id, key(x)]));
  return {
    date: next.checked,
    added: [...after.keys()].filter((id) => !before.has(id)),
    removed: [...before.keys()].filter((id) => !after.has(id)),
    changed: [...after.keys()].filter((id) => before.has(id) && before.get(id) !== after.get(id)),
  };
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}
async function readPrev() {
  try { return await readJson(PREV); } catch { return null; }
}

async function prep() {
  await mkdir(SRC_DIR, { recursive: true });
  await copyFile(DATA, PREV);
  const index = [`Today is ${TODAY}. One file per source below. FAILED means the download was blocked; try that URL with WebFetch.`, ""];
  let n = 0;
  for (const [i, f] of FEEDS.entries()) {
    const text = await fetchText(f.url);
    const file = String(i + 1).padStart(2, "0") + "-" + f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".txt";
    if (text) { n++; await writeFile(new URL(file, SRC_DIR), `${f.name}\n${f.url}\n\n${text}\n`); }
    index.push(`${text ? "OK    " : "FAILED"} ${text ? "work/sources/" + file : ""}  ${f.name}  ${f.url}`);
  }
  await writeFile(new URL("INDEX.txt", SRC_DIR), index.join("\n") + "\n");
  log(`Backed up the deal list; downloaded ${n}/${FEEDS.length} sources to work/sources/`);
}

async function check() {
  let d;
  try { d = await readJson(DATA); } catch (e) { console.error("deals.json is not valid JSON: " + e.message); process.exit(1); }
  const errs = validate(d, await readPrev());
  if (errs.length) { console.error("Problems found:\n - " + errs.slice(0, 40).join("\n - ")); process.exit(1); }
  log(`Looks good: ${d.plans.length} plans, ${d.phones.length} phone deals.`);
}

async function finish() {
  const prev = await readPrev();
  if (!prev) { console.error("No backup found. Run prep first."); process.exit(1); }
  let next, errs;
  try { next = await readJson(DATA); errs = validate(next, prev); }
  catch (e) { errs = ["deals.json is not valid JSON: " + e.message]; }
  if (errs.length) {
    await copyFile(PREV, DATA);
    console.error("[five-bars] Rejected today's update; restored yesterday's list.\n - " + errs.slice(0, 25).join("\n - "));
    process.exit(1);
  }
  next.checked = TODAY;
  next.sources = FEEDS.map(({ name, url, what }) => ({ name, url, what }));
  const changes = diff(prev, next);
  await writeFile(DATA, JSON.stringify(next, null, 1) + "\n");
  await writeFile(CHANGES, JSON.stringify(changes, null, 1) + "\n");
  log(`Saved ${next.plans.length} plans, ${next.phones.length} phone deals. ` +
      `Added ${changes.added.length}, changed ${changes.changed.length}, removed ${changes.removed.length}.`);
}

const cmd = process.argv[2];
const run = { prep, check, finish }[cmd];
if (!run) { console.error("Usage: node scripts/deals.mjs prep|check|finish"); process.exit(1); }
run().catch((e) => { console.error("[five-bars]", e.message); process.exit(1); });
