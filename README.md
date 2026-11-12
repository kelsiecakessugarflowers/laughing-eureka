# Sugar Flower Match quiz (quiz.kelsiecakes.com)

Five questions that point a visitor to the right offer: **Ready to Ship**, **Made to Order**, **Curated** or **Fully Custom**.
It looks and behaves like the Price Estimator (estimator.kelsiecakes.com) and follows the same rules.

## Files (all in `public/`)

| File | What it is |
|---|---|
| `copy.json` | **All the wording.** Edit it on GitHub: pencil icon, change the text between the quotes, commit. |
| `quiz.js` | Questions, scoring, results, email form, analytics |
| `index.html` | Page layout and styles (same look as the estimator) |
| `brand.css`, `logo-main.svg`, `logo-alt.svg`, `favicon.png` | Brand files, copied from the estimator |
| `gtm-iframe-bridge.js` | For the Showit page that embeds the quiz: forwards quiz events to the site's Google Tag Manager |

## Changing the wording

- Questions are `q_<question>` and their answers `opt_<question>_<answer>`. Budget answers come from the estimator's budget list.
- Each result has `<result>_title`, `_summary`, `_bestFor`, `_features` (a list), `_upsell`, `_nextStep`, `_cta`.
  Results are `readyToShip`, `madeToOrder`, `curated`, `fullyCustom`.
- `blurb_<role>_<result>` is the extra line after "Best for" for that role.
- `[Styling Toolkit](https://...)` makes a link. `{minPrice}` and `{minWeeks}` are filled in from the estimator.

## Rules (shared with the estimator)

The quiz reads `https://estimator.kelsiecakes.com/data.json` on load, so these stay in step automatically:
lead times, the budget choices, the custom starting price (cheapest live package), and the spam-check key.

- Budget **under $350** or wedding **less than 3 weeks** away: Ready to Ship (the estimator sends these to the shop too).
- **3-6 weeks** away: Fully Custom as a rush if the budget allows custom and they don't want existing designs, otherwise Ready to Ship
  (Made to Order and Curated need 6 weeks).
- Fully Custom needs a budget at or above the custom starting price ($500 now), or "Not sure yet".
- High budget, 6-12 weeks, wants something unique: Fully Custom.
- "Open to your existing designs" never goes to Fully Custom. Only bakers (not brand new to sugar flowers) get Made to Order.
- Otherwise the highest score wins; ties go Fully Custom > Curated > Made to Order > Ready to Ship.

The **Fully Custom** button opens the estimator with their role, occasion (Wedding) and budget already filled in (`utm_source=quiz`).

## Email results

"Send Me My Results" does two things at once:
1. Posts to the existing results worker (`tiny-rain-7a6b`), unchanged, which sends the email.
2. Saves a row in Airtable **Quiz Leads** (through the estimator's `/api/quiz-lead`, with the same "Verify you are human" check).

Tags sent with both: `role_*`, `experience_*`, `timeline_*` (urgent = under 3 weeks, rush = 3-6 weeks, soon, planning, longterm),
`customization_*`, `budget_*` (low, medium, high, premium, unsure), `quiz_result_*`.

## Analytics

Events: `quiz_start`, `quiz_answer` (question_id, answer_value), `quiz_result` (event_label = result), `quiz_cta`, `quiz_email`.
Opened directly, they go to this page's GTM (GTM-5ZMBM3M). Inside the Showit iframe they're posted to the parent page,
where `gtm-iframe-bridge.js` forwards them.

## Hosting

Cloudflare Worker `quiz` serving `public/` (wrangler.jsonc). Pushing to `main` redeploys.
