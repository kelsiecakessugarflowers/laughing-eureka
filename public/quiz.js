// Sugar Flower Match quiz.
// Wording: copy.json (edit it on GitHub). Lead times, budgets, the custom starting price and the spam-check key
// come from the Price Estimator (estimator.kelsiecakes.com/data.json), so both tools follow the same rules.
const ESTIMATOR = 'https://estimator.kelsiecakes.com';
const OLD_WEBHOOK = 'https://tiny-rain-7a6b.kelsie-a54.workers.dev/';   // existing results-email worker, unchanged
const IMAGES = {
  intro: 'https://cdn.shopify.com/s/files/1/0711/9588/5762/files/Sugar_Flower_Quiz.png?v=1767710525',
  readyToShip: 'https://cdn.shopify.com/s/files/1/0711/9588/5762/files/Your_Result_Ready_to_Ship_Sugar_Flowers.png?v=1767710547',
  madeToOrder: 'https://cdn.shopify.com/s/files/1/0711/9588/5762/files/Your_Result_Individual_Semi_Custom_Sugar_Flowers.png?v=1767710648',
  curated: 'https://cdn.shopify.com/s/files/1/0711/9588/5762/files/Your_Result_Made_to_Order_Sugar_Flower_Bundles.png?v=1767710670',
  fullyCustom: 'https://cdn.shopify.com/s/files/1/0711/9588/5762/files/Your_Result_Custom_Sugar_Flowers.png?v=1767710606',
};
const LINKS = {
  readyToShip: 'https://sugarflowersonline.com/collections/all',
  madeToOrder: 'https://kelsiecakes.com/shop-all/',
  curated: 'https://kelsiecakes.com/bundles/',
  call: 'https://kelsiecakes.com/call/',
};
// Used only if the estimator's settings can't be loaded
const FALLBACK = {leadTime: {shopUnderDays: 21, minimumWeeks: 6, rushWeeks: 8}, shopBudget: 'Under $350',
  budgets: ['Under $350', '$350-$500', '$500-$1,000', '$1,000-$1,500', '$1,500-$2,500', '$2,500+', 'Not sure yet'],
  packages: [{price: 500}], inquiry: {turnstileSiteKey: ''}, legal: {owner: 'Kelsie Cakes LLC', termsUrl: 'https://kelsiecakes.com/terms', privacyUrl: 'https://kelsiecakes.com/privacy'}, gtmId: 'GTM-5ZMBM3M'};

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const money = n => '$' + Math.round(n).toLocaleString('en-US');
// [text](https://link) in copy becomes a link (opens in a new tab)
const linkify = s => esc(s).replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
let T = {}, D = FALLBACK, vars = {}, PICKS = {};
const t = (k, v = {}) => { const x = T[k]; return Array.isArray(x) ? x.map(y => fill(y, v)) : fill(x ?? '', v); };
// {event}: the occasion they picked ("wedding", "birthday"...), or "event"
const eventWord = () => { const o = answers?.occasion?.value; return !o || o === 'Other' ? 'event' : o.toLowerCase(); };
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => ({...vars, event: eventWord(), ...v})[k] ?? '');

// ---- Analytics: same event names as before (quiz_start, quiz_answer, quiz_result), plus quiz_email ----
const framed = window !== window.parent;
function track(event, data = {}) {
  const payload = {event, event_category: 'quiz', ...data};
  if (framed) { try { parent.postMessage({type: 'quiz_analytics', ...payload}, '*'); } catch (e) {} }
  else (window.dataLayer = window.dataLayer || []).push(payload);
}
function loadGtm(id) {
  if (framed || !id) return;   // inside the Showit iframe, the page's own GTM gets the events through gtm-iframe-bridge.js
  window.dataLayer = window.dataLayer || []; window.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});
  const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtm.js?id=' + id; document.head.appendChild(s);
}

// ---- Questions and scoring (the wording is in copy.json) ----
const S = (readyToShip, madeToOrder, curated, fullyCustom) => ({readyToShip, madeToOrder, curated, fullyCustom});
const NONE = S(0, 0, 0, 0);
// The event date becomes the same timeline answers (and tags) as before
const TIMELINE = {urgent: S(3, 0, 0, 0), rush: S(3, 0, 0, 1), soon: S(1, 3, 2, 1), planning: S(0, 2, 2, 2), longterm: S(0, 1, 1, 3)};
const QUESTIONS = [
  {id: 'occasion', options: []},   // the estimator's occasions
  {id: 'role', options: [
    {value: 'baker', scores: S(1, 3, 1, 2)},
    {value: 'vendor', scores: S(2, 0, 2, 3)},
    {value: 'couple', scores: S(2, 0, 2, 3)},
    {value: 'family', scores: S(2, 0, 3, 2)}]},
  {id: 'date', type: 'date'},      // exact date: under 3 weeks urgent, under 6 rush, under 12 soon, under 26 planning, later longterm
  {id: 'size', options: []},       // the estimator's tier options
  {id: 'style', type: 'tiles', options: []},   // the estimator's arrangement styles, with photos
  {id: 'palette', options: ['neutral', 'bold', 'soft', 'bright', 'unsure'].map(value => ({value, scores: NONE}))},
  {id: 'experience', options: [
    {value: 'pro', scores: S(1, 3, 1, 1)},
    {value: 'amateur', scores: S(2, 1, 3, 1)},
    {value: 'novice', scores: S(2, 0, 3, 1)}]},
  {id: 'customization', options: [
    {value: 'custom', scores: S(0, 0, 0, 3)},
    {value: 'existing', scores: S(3, 0, 2, 0)},
    {value: 'adjusted', scores: S(0, 3, 2, 1)}]},
  {id: 'budget', options: []},   // filled from the estimator's budget list
];
const BUDGET_SCORES = {low: S(3, 0, 0, 0), medium: S(1, 3, 3, 1), high: S(0, 1, 1, 4), premium: S(0, 0, 0, 5), unsure: S(1, 1, 2, 2)};
const minPrice = () => Math.min(...(D.packages || []).map(p => p.price).filter(Boolean)) || 500;
// Estimator budget label -> low (shop) / medium (under the custom minimum) / high / premium ($1,000+) / unsure
function budgetClass(label) {
  if (label === D.shopBudget || /^under/i.test(label)) return 'low';
  const m = String(label).match(/^\$([\d,]+)/); if (!m) return 'unsure';
  const n = +m[1].replace(/,/g, '');
  return n < minPrice() ? 'medium' : n < 1000 ? 'high' : 'premium';
}

let step = -1, answers = {}, trackedResult = false, tsToken = '', tsWidget = null, recommended = '';

function calculateResult() {
  const scores = S(0, 0, 0, 0);
  Object.values(answers).forEach(a => Object.keys(scores).forEach(k => { scores[k] += a.scores[k]; }));
  const role = answers.role?.value, experience = answers.experience?.value, timeline = answers.date?.timeline;
  const customization = answers.customization?.value, budget = answers.budget?.value;
  const customOk = ['high', 'premium', 'unsure'].includes(budget);   // custom starts at the cheapest package

  if (budget === 'low') return 'readyToShip';                        // same as the estimator: under $350 -> shop
  if (timeline === 'urgent') return 'readyToShip';                   // same as the estimator: under 3 weeks -> shop
  if (timeline === 'rush') return customOk && customization !== 'existing' ? 'fullyCustom' : 'readyToShip';   // only custom can be rushed
  if (customOk && timeline === 'soon' && customization !== 'existing') return 'fullyCustom';

  const allowed = ['readyToShip', 'madeToOrder', 'curated', 'fullyCustom'].filter(r => r !== 'fullyCustom' || customOk);
  const pick = keys => {
    const ks = keys.filter(k => allowed.includes(k)), max = Math.max(...ks.map(k => scores[k])), win = ks.filter(k => scores[k] === max);
    return ['fullyCustom', 'curated', 'madeToOrder', 'readyToShip'].find(k => win.includes(k)) || win[0];
  };
  if (customization === 'existing') return role !== 'baker' || experience === 'novice' ? pick(['readyToShip', 'curated']) : pick(['readyToShip', 'madeToOrder', 'curated']);
  if (role !== 'baker' || experience === 'novice') return pick(['readyToShip', 'curated', 'fullyCustom']);   // only bakers get made to order
  return pick(['readyToShip', 'madeToOrder', 'curated', 'fullyCustom']);
}
function tags(result) {
  const tg = ['occasion', 'role', 'experience', 'customization', 'budget', 'palette'].filter(k => answers[k]).map(k => `${k}_${slugify(answers[k].value)}`);
  if (answers.date) tg.push('timeline_' + answers.date.timeline);
  if (answers.size) tg.push('size_' + slugify(answers.size.value));
  if (answers.style) tg.push('style_' + slugify(answers.style.value || 'not sure'));
  return [...tg, `quiz_result_${result}`];
}
const slugify = x => String(x).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// ---- The specific pick ----
const priceFor = p => ['baker', 'vendor'].includes(answers.role?.value) ? Math.round(p.price * (1 - D.proDiscount) / D.proRoundTo) * D.proRoundTo : p.price;
function budgetMax() {   // "$500-$1,000" -> 1000, "$2,500+" / "Not sure yet" -> no cap, "Under $350" -> 350
  const l = answers.budget?.label || '', m = l.match(/-\$([\d,]+)/) || l.match(/^under \$([\d,]+)/i);
  return m ? +m[1].replace(/,/g, '') : null;
}
// Fully Custom: same as the estimator (fits the tiers, style sets where in the range, budget caps it)
function customPackage() {
  const tiers = parseInt(answers.size?.value || '0'), f = (D.packages || []).filter(p => (p.tiers || []).includes(tiers)).sort((a, b) => a.price - b.price);
  if (!f.length) return null;
  const style = answers.style?.value, lean = style ? (D.styleLean?.[style] ?? 0.5) : 0;
  let pick = f[Math.round(lean * (f.length - 1))];
  const cap = budgetMax();
  if (cap !== null && priceFor(pick) > cap) { const ok = f.filter(p => priceFor(p) <= cap); pick = ok.length ? ok[ok.length - 1] : f[0]; }
  return pick;
}
// Ready to Ship: the design in rts-picks.json that best matches style, color palette and tiers
function rtsPick() {
  const style = answers.style?.value || '', palette = answers.palette?.value, tiers = parseInt(answers.size?.value || '0');
  const score = d => ((d.styles || []).includes(style) ? 4 : style === '' ? 1 : -9)
    + ((d.palettes || []).includes(palette) ? 3 : palette === 'unsure' ? 1 : 0)
    + (tiers >= (d.minTiers || 1) && tiers <= (d.maxTiers || 9) ? 2 : -2);
  const best = [...RTS].map((d, i) => ({d, s: score(d), i})).sort((a, b) => b.s - a.s || a.i - b.i)[0];
  return best && best.s > 0 ? best.d : null;
}

// ---- Screens ----
function footer() {
  if (framed) return;
  $('#footer').innerHTML = `<img src="logo-alt.svg" alt="Sugar Flowers by Kelsie Cakes">© ${new Date().getFullYear()} ${esc(D.legal.owner)} · <a href="${esc(D.legal.termsUrl)}" target="_top">${esc(t('footerTerms'))}</a> · <a href="${esc(D.legal.privacyUrl)}" target="_top">${esc(t('footerPrivacy'))}</a>`;
}
function renderIntro() {
  step = -1;
  $('#app').innerHTML = `<div class="fade">
    <img class="hero" src="${IMAGES.intro}" alt="Luxury sugar flowers for wedding cakes by Kelsie Cakes">
    <h1 class="title">${esc(t('quiz_title'))}</h1>
    <p class="intro">${esc(t('quiz_subtitle'))}</p>
    <p class="center"><button class="primary" data-act="start">${esc(t('startButton'))}</button></p>
    <p class="center muted">${esc(t('broughtBy'))} <a href="https://kelsiecakes.com" target="_blank" rel="noopener">${esc(t('brandLink'))}</a>.</p></div>`;
}
// Answer wording: roles follow the occasion (opt_role_<role>_other for anything but a wedding)
const optLabel = (q, o) => o.label || (q.id === 'role' && answers.occasion && answers.occasion.value !== 'Wedding' && t(`opt_role_${o.value}_other`)) || t(`opt_${q.id}_${o.value}`);
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function renderQuestion() {
  const q = QUESTIONS[step], total = QUESTIONS.length, picked = answers[q.id]?.value;
  let body;
  if (q.type === 'date') body = `<div class="datebox"><input type="date" id="qdate" min="${ymd(new Date())}" value="${esc(picked || '')}" aria-label="${esc(t('q_date'))}">
      <button class="primary wide" data-act="date">${esc(t('dateNext'))}</button><p class="msg err" id="dateMsg" hidden></p></div>`;
  else if (q.type === 'tiles') body = `<div class="tiles">${q.options.map((o, i) => `<button class="tile${o.value === picked ? ' on' : ''}" data-opt="${i}">
      <img src="${esc(o.img)}" alt="" loading="lazy"><span>${esc(o.label)}</span></button>`).join('')}</div>`;
  else body = `<div class="opts">${q.options.map((o, i) => `<button class="opt${o.value === picked ? ' on' : ''}" data-opt="${i}">${esc(optLabel(q, o))}</button>`).join('')}</div>`;
  $('#app').innerHTML = `<section class="fade">
    <div class="progress" role="progressbar" aria-valuenow="${step + 1}" aria-valuemin="1" aria-valuemax="${total}" aria-label="Quiz progress"><i style="width:${(step + 1) / total * 100}%"></i></div>
    <p class="counter">${esc(t('questionCounter', {n: step + 1, total}))}</p>
    <h2 class="q">${esc(t('q_' + q.id))}</h2>
    ${body}
    ${step > 0 ? `<button class="back" data-act="back">${esc(t('back'))}</button>` : ''}</section>`;
  window.scrollTo(0, 0);
}
function answerDate() {
  const v = $('#qdate').value, msg = $('#dateMsg');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { msg.textContent = t('dateMissing'); msg.hidden = false; return; }
  const days = Math.round((new Date(v + 'T12:00') - new Date()) / 86400000), w = D.leadTime;
  const timeline = days < w.shopUnderDays ? 'urgent' : days < w.minimumWeeks * 7 ? 'rush' : days < 84 ? 'soon' : days < 183 ? 'planning' : 'longterm';
  answers.date = {value: v, timeline, scores: TIMELINE[timeline]};
  track('quiz_answer', {question_id: 'date', answer_value: timeline});
  step++; renderQuestion();
}
function estimatorLink() {
  const u = new URL(ESTIMATOR), role = answers.role?.value, budget = answers.budget?.label;
  if (role) u.searchParams.set('for', role);
  if (answers.occasion) u.searchParams.set('occasion', answers.occasion.value);
  if (answers.date?.value) u.searchParams.set('date', answers.date.value);
  if (answers.size) u.searchParams.set('size', answers.size.value);
  if (answers.style) u.searchParams.set('style', answers.style.value || 'notsure');
  if (budget && (D.budgets || []).includes(budget)) u.searchParams.set('budget', budget);
  u.searchParams.set('utm_source', 'quiz');
  return u.toString();
}
function renderResult() {
  const key = calculateResult(), role = answers.role?.value || 'couple';
  if (!trackedResult) { track('quiz_result', {event_label: key}); trackedResult = true; }
  const blurb = t(`blurb_${role}_${key}`) || t(`blurb_couple_${key}`);
  // The specific pick: a package for Fully Custom, a design for Ready to Ship
  const pkg = key === 'fullyCustom' ? customPackage() : null, rts = key === 'readyToShip' ? rtsPick() : null;
  const pkgImg = pkg && (D.packageImages || {})[pkg.name], fmt = n => t('priceFormat', {price: money(n)}) || money(n);
  const disc = PICKS.discount, shopCap = parseInt(String(D.shopBudget).replace(/\D/g, '')) || 350;
  const discOn = rts && disc?.code && answers.budget?.value === 'low' && rts.price > shopCap;   // budget under $350, design just over it
  const rtsUrl = rts && (discOn ? `${PICKS.shopUrl}/discount/${encodeURIComponent(disc.code)}?redirect=${encodeURIComponent('/products/' + rts.handle)}` : `${PICKS.shopUrl}/products/${rts.handle}`);
  recommended = pkg ? pkg.name : rts ? rts.title : '';
  const pickCard = pkg ? `<section class="pick">
      <h2 class="band">${esc(t('pickHeading'))}</h2>
      ${pkgImg ? `<img class="pickimg wide" src="${esc(pkgImg)}" alt="${esc(pkg.name)}">` : ''}
      <p class="rtitle">${esc(t('fullyCustom_pickTitle', {package: pkg.name}))}</p>
      <p class="pprice">${esc(fmt(priceFor(pkg)))}</p>
      ${pkg.bestFor ? `<p class="bestfor"><b>${esc(t('bestForLabel'))}</b> ${esc(pkg.bestFor)}</p>` : ''}
    </section>` : rts ? `<section class="pick">
      <h2 class="band">${esc(t('pickHeading'))}</h2>
      <img class="pickimg" src="${esc(rts.image)}" alt="${esc(rts.title)}">
      <p class="rtitle">${esc(rts.title)}</p>
      <p class="pprice">${discOn ? `<s>${money(rts.price)}</s> ${money(Math.round(rts.price * (1 - disc.percent / 100)))}` : money(rts.price)}</p>
      ${discOn ? `<p class="note">${esc(t('discountNote', {code: disc.code, percent: disc.percent}))}</p>` : ''}
      ${rts.blurb ? `<p style="margin:8px 0 0">${esc(rts.blurb)}</p>` : ''}
    </section>` : '';
  const ctas = key === 'fullyCustom'
    ? `<a class="btn primary" href="${esc(estimatorLink())}" target="_top" data-cta="estimator">${esc(t('fullyCustom_cta'))}</a>
       <a class="btn secondary" href="${LINKS.call}" target="_blank" rel="noopener" data-cta="call">${esc(t('fullyCustom_secondary'))}</a>`
    : rts ? `<a class="btn primary" href="${esc(rtsUrl)}" target="_blank" rel="noopener" data-cta="shop_design">${esc(t('shopThisDesign'))}</a>
       <a class="btn secondary" href="${LINKS.readyToShip}" target="_blank" rel="noopener" data-cta="shop">${esc(t('readyToShip_cta'))}</a>`
    : `<a class="btn primary" href="${LINKS[key]}" target="_blank" rel="noopener" data-cta="shop">${esc(t(key + '_cta'))}</a>`;
  $('#app').innerHTML = `<div class="fade">
    <section>
      <img class="hero" src="${IMAGES[key]}" alt="${esc(t(key + '_title'))}">
      <p class="eyebrow">${esc(t('resultEyebrow'))}</p>
      <p class="rtitle">${esc(t(key + '_title'))}</p>
      <p style="margin:0">${esc(t(key + '_summary'))}</p>
      <p class="bestfor"><b>${esc(t('bestForLabel'))}</b> ${esc(t(key + '_bestFor'))}${blurb ? ' — ' + esc(blurb) : ''}</p>
    </section>
    ${pickCard}
    <section>
      <h2 class="band">${esc(t('whatYouGet'))}</h2>
      <ul class="feat">${t(key + '_features').map(f => `<li>${esc(f)}</li>`).join('')}</ul>
    </section>
    ${t(key + '_upsell') ? `<p class="note" style="margin-bottom:12px">${linkify(t(key + '_upsell'))}</p>` : ''}
    <section class="center">
      <p style="margin:0;font-weight:600;color:var(--ink)">${esc(t(key + '_nextStep'))}</p>
      <div class="ctas">${ctas}</div>
    </section>
    <section>
      <h2 class="band">${esc(t('email_prompt'))}</h2>
      <p class="muted" style="margin-top:0">${esc(t('emailHelp'))}</p>
      <form id="emailForm" novalidate>
        <div class="hp" aria-hidden="true"><label for="company">Company</label><input id="company" tabindex="-1" autocomplete="off"></div>
        <label for="name">${esc(t('labelName'))}</label><input id="name" autocomplete="given-name" placeholder="${esc(t('placeholderName'))}">
        <label for="email">${esc(t('labelEmail'))}</label><input id="email" type="email" autocomplete="email" inputmode="email" placeholder="${esc(t('placeholderEmail'))}">
        <div id="ts"></div>
        <button class="primary wide" type="submit" id="send" style="margin-top:12px">${esc(t('email_button_text'))}</button>
        <div id="msg"></div>
      </form>
    </section>
    <p class="center"><button data-act="restart">${esc(t('retake'))}</button></p></div>`;
  tsWidget = null; tsToken = '';
  loadTurnstile();
  window.scrollTo(0, 0);
}

// Spam check on the email form (Turnstile; same site key as the estimator)
let tsScript = false, onToken = null;   // onToken: a pending Airtable save waiting for a fresh token
const tsQueue = [];
function withTurnstile(fn) {
  if (window.turnstile?.render) return fn();
  tsQueue.push(fn);
  if (tsScript) return; tsScript = true;
  window.onTurnstileLoad = () => tsQueue.splice(0).forEach(f => f());
  const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit'; s.async = true; document.head.appendChild(s);
}
const tokenSink = tok => { tsToken = tok; if (onToken && tok) { const f = onToken; onToken = null; f(tok); } };
function loadTurnstile() {
  const key = D.inquiry?.turnstileSiteKey; if (!key) return;
  withTurnstile(() => { if ($('#ts')) tsWidget = window.turnstile.render('#ts', {sitekey: key, callback: tokenSink, 'expired-callback': () => { tsToken = ''; }}); });
}

// ---- Saving to Airtable "Quiz Leads" ----
// The results email and the Airtable copy are sent separately. If the email goes out but the save fails, the visitor
// still sees success, and the save is retried: twice right away with a fresh spam-check token, then on their next
// visit (kept in this browser). Each spam-check token works only once, which is why a retry needs a new one.
const PENDING_KEY = 'kc_quiz_lead_pending';
const store = {
  get: () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch (e) { return null; } },
  set: v => { try { v ? localStorage.setItem(PENDING_KEY, JSON.stringify(v)) : localStorage.removeItem(PENDING_KEY); } catch (e) {} },
};
const saveLead = (lead, token) => fetch(ESTIMATOR + '/api/quiz-lead', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...lead, turnstile: token})})
  .then(r => r.ok).catch(() => false);
// Get a new token from a widget (the form's, or a small one that only shows itself if Turnstile needs a click)
function freshToken(widget) {
  return new Promise(resolve => {
    if (!D.inquiry?.turnstileSiteKey) return resolve('');
    const timer = setTimeout(() => { onToken = null; resolve(null); }, 30000);
    onToken = tok => { clearTimeout(timer); resolve(tok); };
    withTurnstile(() => {
      if (widget !== null && widget !== undefined) { tsToken = ''; window.turnstile.reset(widget); return; }
      let box = $('#tsRetry'); if (!box) { box = document.createElement('div'); box.id = 'tsRetry'; $('#footer').before(box); }
      window.turnstile.render(box, {sitekey: D.inquiry.turnstileSiteKey, appearance: 'interaction-only', callback: tokenSink});
    });
  });
}
async function retrySave(lead, widget, tries) {
  for (let i = 0; i < tries; i++) {
    const tok = await freshToken(widget);
    if (tok === null) break;   // no token (Turnstile didn't load or needs a click nobody gave)
    if (await saveLead(lead, tok)) { store.set(null); track('quiz_lead_saved_on_retry', {attempt: i + 1}); return true; }
  }
  store.set(lead);   // try again on their next visit
  track('quiz_lead_unsaved', {event_label: lead.result});
  return false;
}

async function submitEmail(e) {
  e.preventDefault();
  const msg = $('#msg'), btn = $('#send'), name = $('#name').value.trim(), email = $('#email').value.trim();
  const say = (cls, html) => { msg.className = 'msg ' + cls; msg.innerHTML = html; };
  $('#email').classList.remove('bad');
  if ($('#company').value.trim()) return say('err', esc(t('emailBot')));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('#email').classList.add('bad'); return say('err', esc(t('emailInvalid'))); }
  if (D.inquiry?.turnstileSiteKey && !tsToken) return say('err', esc(t('verifyHuman')));
  const result = calculateResult(), tg = tags(result), a = k => answers[k]?.value || '';
  btn.disabled = true; btn.textContent = t('sending'); msg.innerHTML = '';
  const base = {email, name, role: a('role'), experience: a('experience'), budget: a('budget'), timeline: answers.date?.timeline || '', customization: a('customization'), result, tags: tg,
    occasion: a('occasion'), eventDate: a('date'), size: a('size'), style: answers.style ? (a('style') || 'Not sure yet') : '', palette: a('palette'), recommended};
  // The existing results email (unchanged) and a row in Airtable "Quiz Leads", side by side
  const post = (url, body) => fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}).then(r => r.ok).catch(() => false);
  const lead = {...base, utmSource: new URLSearchParams(location.search).get('utm_source') || ''};
  const [mailed, saved] = await Promise.all([
    post(OLD_WEBHOOK, {...base, timestamp: new Date().toISOString()}),
    saveLead(lead, tsToken),
  ]);
  track('quiz_email', {event_label: result, emailed: mailed, saved});
  if (mailed) {   // the email comes from the existing worker; Airtable is a bonus copy
    say('ok', `<p style="margin:0 0 4px;font-weight:600">${esc(t('emailSuccess'))}</p><p style="margin:0">${esc(t('emailSuccessSub'))}</p>`);
    ['name', 'email'].forEach(id => { $('#' + id).disabled = true; }); btn.hidden = true;
    if (saved) $('#ts').hidden = true;
    else { store.set(lead); retrySave(lead, tsWidget, 2).then(ok => { if (ok) $('#ts').hidden = true; }); }   // email went out but Airtable didn't get it
  } else {
    say('err', esc(t('emailError'))); btn.disabled = false; btn.textContent = t('email_button_text');
    if (window.turnstile?.reset && tsWidget !== null) { window.turnstile.reset(tsWidget); tsToken = ''; }
  }
}

document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]')?.dataset.act, opt = e.target.closest('[data-opt]'), cta = e.target.closest('[data-cta]');
  if (act === 'start') { track('quiz_start'); step = 0; renderQuestion(); }
  if (act === 'back') { step--; renderQuestion(); }
  if (act === 'date') answerDate();
  if (act === 'restart') { answers = {}; trackedResult = false; renderIntro(); window.scrollTo(0, 0); }
  if (cta) track('quiz_cta', {event_label: cta.dataset.cta});
  if (opt && !opt.disabled) {
    const q = QUESTIONS[step], o = q.options[+opt.dataset.opt];
    document.querySelectorAll('.opt, .tile').forEach(b => { b.disabled = true; b.classList.toggle('on', b === opt); });
    track('quiz_answer', {question_id: q.id, answer_value: o.value});
    answers[q.id] = o;
    setTimeout(() => { step++; step < QUESTIONS.length ? renderQuestion() : renderResult(); }, 220);
  }
});
document.addEventListener('submit', e => { if (e.target.id === 'emailForm') submitEmail(e); });

let RTS = [];
Promise.all([
  fetch('copy.json').then(r => r.json()),
  fetch(ESTIMATOR + '/data.json').then(r => r.ok ? r.json() : null).catch(() => null),
  fetch('rts-picks.json').then(r => r.json()).catch(() => ({designs: []})),
]).then(([copy, data, picks]) => {
  T = copy; if (data) D = {...FALLBACK, ...data}; RTS = picks.designs || []; PICKS = picks;
  const Q = id => QUESTIONS.find(q => q.id === id);
  Q('occasion').options = (D.eventTypes || ['Wedding', 'Birthday', 'Holiday Party', 'Other']).map(value => ({value, label: t('opt_occasion_' + slugify(value)) || value, scores: NONE}));
  Q('size').options = (D.tierOptions || []).map(value => ({value, label: value, scores: NONE}));
  Q('style').options = [...(D.styles || []).map(value => ({value, label: value, img: `${ESTIMATOR}/photos/${slugify(value).replace(/_/g, '-')}.jpg`, scores: NONE})),
    {value: '', label: t('styleNotSure'), img: `${ESTIMATOR}/photos/not-sure-yet.jpg`, scores: NONE}];
  vars = {minPrice: money(minPrice()), minWeeks: D.leadTime.minimumWeeks, rushWeeks: D.leadTime.rushWeeks};
  QUESTIONS.find(q => q.id === 'budget').options = D.budgets.map(label => ({value: budgetClass(label), label, scores: BUDGET_SCORES[budgetClass(label)]}));
  document.title = t('pageTitle') || document.title;
  loadGtm(D.gtmId); footer(); renderIntro();
  // A signup from an earlier visit that never reached Airtable: try once more
  const pending = store.get(); if (pending?.email) retrySave(pending, null, 1);
});
