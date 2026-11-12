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
let T = {}, D = FALLBACK, vars = {};
const t = (k, v = {}) => { const x = T[k]; return Array.isArray(x) ? x.map(y => fill(y, v)) : fill(x ?? '', v); };
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => ({...vars, ...v})[k] ?? '');

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
const QUESTIONS = [
  {id: 'timeline', options: [
    {value: 'urgent', scores: S(3, 0, 0, 0)},     // under the estimator's shop cutoff (3 weeks)
    {value: 'rush', scores: S(3, 0, 0, 1)},       // under the 6-week minimum: ready to ship, or custom as a rush
    {value: 'soon', scores: S(1, 3, 2, 1)},
    {value: 'planning', scores: S(0, 2, 2, 2)},
    {value: 'longterm', scores: S(0, 1, 1, 3)}]},
  {id: 'role', options: [
    {value: 'baker', scores: S(1, 3, 1, 2)},
    {value: 'vendor', scores: S(2, 0, 2, 3)},
    {value: 'couple', scores: S(2, 0, 2, 3)},
    {value: 'family', scores: S(2, 0, 3, 2)}]},
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

let step = -1, answers = {}, trackedResult = false, tsToken = '', tsWidget = null;

function calculateResult() {
  const scores = S(0, 0, 0, 0);
  Object.values(answers).forEach(a => Object.keys(scores).forEach(k => { scores[k] += a.scores[k]; }));
  const role = answers.role?.value, experience = answers.experience?.value, timeline = answers.timeline?.value;
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
  return [...['role', 'experience', 'timeline', 'customization', 'budget'].filter(k => answers[k]).map(k => `${k}_${answers[k].value}`), `quiz_result_${result}`];
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
function renderQuestion() {
  const q = QUESTIONS[step], total = QUESTIONS.length, picked = answers[q.id]?.value;
  $('#app').innerHTML = `<section class="fade">
    <div class="progress" role="progressbar" aria-valuenow="${step + 1}" aria-valuemin="1" aria-valuemax="${total}" aria-label="Quiz progress"><i style="width:${(step + 1) / total * 100}%"></i></div>
    <p class="counter">${esc(t('questionCounter', {n: step + 1, total}))}</p>
    <h2 class="q">${esc(t('q_' + q.id))}</h2>
    <div class="opts">${q.options.map((o, i) => `<button class="opt${o.value === picked ? ' on' : ''}" data-opt="${i}">${esc(o.label || t(`opt_${q.id}_${o.value}`))}</button>`).join('')}</div>
    ${step > 0 ? `<button class="back" data-act="back">${esc(t('back'))}</button>` : ''}</section>`;
  window.scrollTo(0, 0);
}
function estimatorLink() {
  const u = new URL(ESTIMATOR), role = answers.role?.value, budget = answers.budget?.label;
  if (role) u.searchParams.set('for', role);
  u.searchParams.set('occasion', 'Wedding');
  if (budget && (D.budgets || []).includes(budget)) u.searchParams.set('budget', budget);
  u.searchParams.set('utm_source', 'quiz');
  return u.toString();
}
function renderResult() {
  const key = calculateResult(), role = answers.role?.value || 'couple';
  if (!trackedResult) { track('quiz_result', {event_label: key}); trackedResult = true; }
  const blurb = t(`blurb_${role}_${key}`) || t(`blurb_couple_${key}`);
  const ctas = key === 'fullyCustom'
    ? `<a class="btn primary" href="${esc(estimatorLink())}" target="_top" data-cta="estimator">${esc(t('fullyCustom_cta'))}</a>
       <a class="btn secondary" href="${LINKS.call}" target="_blank" rel="noopener" data-cta="call">${esc(t('fullyCustom_secondary'))}</a>`
    : `<a class="btn primary" href="${LINKS[key]}" target="_blank" rel="noopener" data-cta="shop">${esc(t(key + '_cta'))}</a>`;
  $('#app').innerHTML = `<div class="fade">
    <section>
      <img class="hero" src="${IMAGES[key]}" alt="${esc(t(key + '_title'))}">
      <p class="eyebrow">${esc(t('resultEyebrow'))}</p>
      <p class="rtitle">${esc(t(key + '_title'))}</p>
      <p style="margin:0">${esc(t(key + '_summary'))}</p>
      <p class="bestfor"><b>${esc(t('bestForLabel'))}</b> ${esc(t(key + '_bestFor'))}${blurb ? ' — ' + esc(blurb) : ''}</p>
    </section>
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
let tsScript = false;
function loadTurnstile() {
  const key = D.inquiry?.turnstileSiteKey; if (!key) return;
  const draw = () => { if ($('#ts')) tsWidget = window.turnstile.render('#ts', {sitekey: key, callback: tok => { tsToken = tok; }, 'expired-callback': () => { tsToken = ''; }}); };
  if (window.turnstile?.render) return draw();
  window.onTurnstileLoad = draw;
  if (tsScript) return; tsScript = true;
  const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit'; s.async = true; document.head.appendChild(s);
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
  const base = {email, name, role: a('role'), experience: a('experience'), budget: a('budget'), timeline: a('timeline'), customization: a('customization'), result, tags: tg};
  // The existing results email (unchanged) and a row in Airtable "Quiz Leads", side by side
  const post = (url, body) => fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}).then(r => r.ok).catch(() => false);
  const [mailed, saved] = await Promise.all([
    post(OLD_WEBHOOK, {...base, timestamp: new Date().toISOString()}),
    post(ESTIMATOR + '/api/quiz-lead', {...base, turnstile: tsToken, utmSource: new URLSearchParams(location.search).get('utm_source') || ''}),
  ]);
  track('quiz_email', {event_label: result, emailed: mailed, saved});
  if (mailed) {   // the email comes from the existing worker; Airtable is a bonus copy
    say('ok', `<p style="margin:0 0 4px;font-weight:600">${esc(t('emailSuccess'))}</p><p style="margin:0">${esc(t('emailSuccessSub'))}</p>`);
    ['name', 'email'].forEach(id => { $('#' + id).disabled = true; }); btn.hidden = true; $('#ts').hidden = true;
  } else {
    say('err', esc(t('emailError'))); btn.disabled = false; btn.textContent = t('email_button_text');
    if (window.turnstile?.reset && tsWidget !== null) { window.turnstile.reset(tsWidget); tsToken = ''; }
  }
}

document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]')?.dataset.act, opt = e.target.closest('[data-opt]'), cta = e.target.closest('[data-cta]');
  if (act === 'start') { track('quiz_start'); step = 0; renderQuestion(); }
  if (act === 'back') { step--; renderQuestion(); }
  if (act === 'restart') { answers = {}; trackedResult = false; renderIntro(); window.scrollTo(0, 0); }
  if (cta) track('quiz_cta', {event_label: cta.dataset.cta});
  if (opt && !opt.disabled) {
    const q = QUESTIONS[step], o = q.options[+opt.dataset.opt];
    document.querySelectorAll('.opt').forEach(b => { b.disabled = true; b.classList.toggle('on', b === opt); });
    track('quiz_answer', {question_id: q.id, answer_value: o.value});
    answers[q.id] = o;
    setTimeout(() => { step++; step < QUESTIONS.length ? renderQuestion() : renderResult(); }, 220);
  }
});
document.addEventListener('submit', e => { if (e.target.id === 'emailForm') submitEmail(e); });

Promise.all([
  fetch('copy.json').then(r => r.json()),
  fetch(ESTIMATOR + '/data.json').then(r => r.ok ? r.json() : null).catch(() => null),
]).then(([copy, data]) => {
  T = copy; if (data) D = {...FALLBACK, ...data};
  vars = {minPrice: money(minPrice()), minWeeks: D.leadTime.minimumWeeks, rushWeeks: D.leadTime.rushWeeks};
  QUESTIONS.find(q => q.id === 'budget').options = D.budgets.map(label => ({value: budgetClass(label), label, scores: BUDGET_SCORES[budgetClass(label)]}));
  document.title = t('pageTitle') || document.title;
  loadGtm(D.gtmId); footer(); renderIntro();
});
