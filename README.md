# laughing-eureka
Sugar flowers offer quiz


You’ve got a solid little quiz engine here. It renders cleanly, the scoring model is sane, and the config hooks are chef’s kiss for an embeddable widget.

That said, a few things are gonna bite you in production (or just quietly lower conversions). Here’s what I’d fix first.

⸻

1) Your “View Options” button goes to Canva 🤨

Right now you’re sending people to https://canva.com. That’s… bold. Like “send them to the mall and hope they find your shop” bold.

Replace this with a result-specific URL map (Ready-to-Ship goes to sugarflowersonline.com, etc.).

const resultLinks = {
  readyToShip: "https://sugarflowersonline.com/collections/ready-to-ship",  // example
  madeToOrder: "https://kelsiecakes.com/shop-all/?filter=made-to-order",    // example
  curated: "https://kelsiecakes.com/shop-all/?filter=curated",
  fullyCustom: "https://kelsiecakes.com/work-with-me"
};

Then swap your button click:

onclick="window.open(resultLinks['${resultKey}'], '_blank', 'noopener,noreferrer')"

(Or don’t open a new tab at all—new tabs can feel spammy and some embed contexts block them.)

⸻

2) Tie scores = “first key wins” (kinda random)

This line:

const winner = Object.keys(scores).find(key => scores[key] === maxScore);

If there’s a tie, it picks the first object key. That means ties always bias toward readyToShip because it’s listed first. That may or may not be what you want, but right now it’s accidental.

If you want a deliberate tie-breaker, do it explicitly:

Option A: “Most premium wins” (nice for upsells)

const priority = ["fullyCustom", "curated", "madeToOrder", "readyToShip"];
const winners = Object.keys(scores).filter(k => scores[k] === maxScore);
const winner = priority.find(k => winners.includes(k));
return winner;

Option B: “Most time-appropriate wins”

If timeline is “urgent,” always pick readyToShip if it’s tied, etc. (More complex, but very logical.)

⸻

3) Your lead times contradict your own copy

Question 1 says “Less than 6 weeks away” but results say:
	•	Ready to ship: “arrive in days” ✅
	•	Made to order: “Minimum 6 weeks lead time required.” ✅
	•	Curated: “Minimum 6 weeks lead time” ✅
	•	Fully custom: “Rush lead times available” ✅

But your scoring currently lets someone with an urgent timeline still win fullyCustom if they choose “fully bespoke” + “high-touch” + “$500+” (it’s not impossible).

If you don’t want that, add hard constraints:

function calculateResult() {
  const scores = { readyToShip: 0, madeToOrder: 0, curated: 0, fullyCustom: 0 };

  Object.values(answers).forEach(a => {
    Object.keys(scores).forEach(k => (scores[k] += a.scores[k]));
  });

  // Hard gate: if timeline is urgent, force readyToShip unless you truly offer rush custom
  if (answers.timeline?.value === "urgent") return "readyToShip";

  // Or soften it: heavily penalize non-RTS
  if (answers.timeline?.value === "urgent") {
    scores.madeToOrder -= 999;
    scores.curated -= 999;
    // allow fullyCustom only if rush is truly real
    scores.fullyCustom -= 999;
  }

  const max = Math.max(...Object.values(scores));
  const winners = Object.keys(scores).filter(k => scores[k] === max);
  const priority = ["fullyCustom", "curated", "madeToOrder", "readyToShip"];
  return priority.find(k => winners.includes(k));
}


⸻

4) Your fancy font won’t load unless you load it

You set font_family: "Playfair Display" but you never load Playfair. In most environments, it’ll silently fall back to Georgia.

Add this in <head> (Google Fonts example):

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet">

Or swap to a safe font stack if you want zero external dependencies.

⸻

5) Accessibility: these buttons need keyboard + focus love

Right now they’re clickable but not super accessible.

Easy wins:
	•	Add type="button" so forms don’t do weird stuff if embedded.
	•	Add focus-visible styles.
	•	Add aria-live to the container when the question changes.

Example tweak in your option button template:

<button
  type="button"
  class="option-card w-full p-6 rounded-lg text-left shadow-md focus:outline-none focus:ring-2"
  ...
>

(If you’re using Tailwind, you can use focus:ring-2 focus:ring-offset-2 etc.)

⸻

6) Tiny UX polish: show progress as “answered” not “current index”

You’re doing:

const progress = ((currentQuestion) / questions.length) * 100;

That’s fine, but visually it means Q1 starts at 0% even though the user is “in” the quiz.

If you want it to feel better, use:

const progress = ((currentQuestion + 1) / questions.length) * 100;

⸻

7) You’re storing whole option objects in answers

Totally fine, but it’s heavier than needed and can get annoying later if you want to send data to analytics.

Instead store just { value, scores } or even just option.value and look up scores. Not urgent, just future-proofing.

⸻

8) Analytics hook (because you know you’ll want it)

Add a simple event dispatcher so you can plug in Google Tag Manager / Meta / whatever later without rewriting the app:

function track(eventName, detail = {}) {
  window.dispatchEvent(new CustomEvent("quiz:event", { detail: { eventName, ...detail } }));
}

Call it in places like:

track("answer_selected", { questionId: question.id, answer: option.value });
track("quiz_completed", { result: resultKey, scores });

Then you can listen externally

Email marketing: connect it after, not before

Do not gate the quiz behind an email wall.

That kills completion.

Instead:
	•	Let them finish the quiz
	•	Show results
	•	Then offer:
“Want these links + next steps sent to your email?”

This works better and feels respectful.

What to send to email (automatically):
	•	Their result
	•	Links to the correct shop / page
	•	One reassurance sentence
	•	A soft CTA (not a pitch)

Tagging (this is where it gets powerful):

Apply tags like:
	•	quiz_result_ready_to_ship
	•	quiz_result_curated
	•	quiz_result_fully_custom
	•	role_pro
	•	role_couple

