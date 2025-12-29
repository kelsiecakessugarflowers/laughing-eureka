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
All selected answers add up into a total score per result bucket.

Guardrails (rules that override pure scoring)

Inside calculateResult():
	1.	Urgent timeline

	•	If timeline is urgent (< 6 weeks) → force readyToShip

	2.	High budget + short timeline + not “existing designs”

	•	If budget is high and timeline is soon and customization is NOT existing
→ force fullyCustom

	3.	Customization = existing designs

	•	If customization is existing, do NOT send to Fully Custom
	•	If role isn’t baker → only consider RTS + Curated
	•	If role is baker → consider RTS + MTO + Curated

	4.	Made to Order restriction

	•	Only bakers/cake decorators can be routed into madeToOrder
	•	If role isn’t baker, MTO is removed from the eligible pool

Tie-break priority

If scores tie, priority order is:
	1.	fullyCustom
	2.	curated
	3.	madeToOrder
	4.	readyToShip

This is controlled inside pickFromScores().

⸻

Tags + segmentation (IMPORTANT)

Email submissions include clean tags so automations can do their job without weird guesswork.

Tags are generated in:

getSegmentationTags(resultKey)

It adds:
	•	role_baker | role_vendor | role_couple | role_family
	•	experience_pro | experience_amateur | experience_novice
	•	timeline_urgent | timeline_soon | timeline_planning | timeline_longterm
	•	customization_custom | customization_existing | customization_adjusted
	•	budget_low | budget_medium | budget_high | budget_unsure
	•	quiz_result_readyToShip | quiz_result_madeToOrder | quiz_result_curated | quiz_result_fullyCustom

Submission object stored via dataSdk.create() includes:
	•	email
	•	result
	•	timestamp
	•	role/timeline/experience/customization/budget
	•	tags (comma-separated string)

⸻

Analytics events

trackAnalytics() sends events to:
	•	GA4 via window.gtag if available
	•	Otherwise GTM via window.dataLayer

Tracked events:
	•	quiz_answer
	•	question_id
	•	answer_value
	•	quiz_result
	•	event_label = final resultKey

(If future me wants deeper data: add email submit success/fail events in handleEmailSubmit().)

⸻

Editing copy & links (where to look)

Quiz text
	•	Intro title/subtitle: defaultConfig.quiz_title, defaultConfig.quiz_subtitle
	•	Result titles: defaultConfig.ready_to_ship_title, etc.

Questions

Edit in questions[]:
	•	question text
	•	options[] text/value
	•	scoring per option

Results (offer cards)

Edit in results{}:
	•	description
	•	durability
	•	clarifier
	•	features[]
	•	upsell
	•	nextStep
	•	emailContent.shopLink, reassurance, cta

Links per offer:
	•	RTS → https://kelsiecakes.com/ready-to-ship
	•	MTO → https://kelsiecakes.com/made-to-order
	•	Curated → https://kelsiecakes.com/curated
	•	Fully Custom → https://kelsiecakes.com/fully-custom

⸻

UI + styling notes
	•	Tailwind is loaded, but most styling is done via template strings + inline style variables.
	•	Hover states are applied using event listeners (not inline onmouseover).
	•	Fonts:
	•	headings: Source Serif 4
	•	body: Raleway

Color variables used inside renderQuiz() / renderIntro():
	•	background / surface / text / primary / secondary come from config (Element SDK)
	•	accent colors are local constants:
	•	accentColor = #D4A574
	•	deepAccentColor = #492C38
	•	mutedColor = #5A524E
	•	softHighlight = #FAF7F4

⸻

SDK dependencies

elementSdk

Used for:
	•	live config editing (colors, font, sizes, labels)
	•	calling onConfigChange(newConfig)
	•	mapToCapabilities() defines which fields are editable in the panel
	•	mapToEditPanelValues() defines text fields shown in editor

dataSdk

Used for:
	•	initializing with dataHandler
	•	creating submissions with dataSdk.create(submission)

If dataSdk.init() fails, quiz still runs — but email submissions won’t save.

⸻

Troubleshooting (fast)

Email submit “does nothing”
	•	Check window.dataSdk exists
	•	Check dataSdk.init() succeeds in init()
	•	Check console for SDK errors

Wrong results being returned
	•	Inspect calculateResult()
	•	Confirm scoring weights inside questions[]
	•	Confirm guardrails aren’t overriding what you expect

Tags look wrong
	•	Check getSegmentationTags(resultKey)
	•	Confirm answers contains values for each question id

⸻

Future improvements (nice-to-haves)
	•	Role-aware timeline question text (“event date/delivery date” for vendors/bakers)
	•	Track email submit success/fail as analytics events
	•	Add a safe fallback for missing emailContent.shopLink
	•	Make “we/our” language consistent with brand voice (me/I/my)
