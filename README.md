# Wedding Cake Topper Quiz (Kelsie Cakes)

This is a lightweight, single-file quiz that recommends the best “cake topper / sugar flower” path for a visitor and (optionally) collects their email + quiz metadata for follow-up.

It’s designed to:
- Help people choose the right offer (Ready to Ship / Made to Order / Curated / Fully Custom)
- Reduce decision fatigue
- Tag/segment people cleanly for email automations
- Track basic analytics (answers + final result)

---

## What this quiz does (high level)

1. **Shows intro screen** → “Start Quiz”
2. **Asks 5 questions**
   - role
   - timeline
   - experience
   - customization
   - budget
3. **Scores answers** + applies guardrails
4. **Displays a single result**
5. **CTA button** opens the recommended shop/offer page
6. **Email capture form** saves a submission via `dataSdk.create()` with tags

---

## Key files / structure

This is currently a **single HTML file** with embedded JS.

Main moving parts:
- `defaultConfig` → design + editable text defaults (for Element SDK edit panel)
- `questions[]` → the quiz questions and their scoring
- `results{}` → result copy + features + links
- `calculateResult()` → scoring + routing logic
- `renderIntro()` / `renderQuiz()` → UI rendering
- `handleEmailSubmit()` → saves email + quiz metadata + tags
- `trackAnalytics()` → pushes events to GA (`gtag`) or GTM (`dataLayer`)
- `elementSdk` → supports visual editor config overrides
- `dataSdk` → saves quiz submissions

---

## How scoring works (the “brain”)

### Base scoring
Each answer option includes a `scores` object like:

```js
scores: { readyToShip: 1, madeToOrder: 3, curated: 1, fullyCustom: 2 }