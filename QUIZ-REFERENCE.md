# Wedding Sugar Flower Quiz — Internal Reference

This document is a plain-English reference for the current quiz logic and content so you can review the full experience without retaking the quiz.

## Quiz at a Glance

- **Quiz title:** Find Your Perfect Sugar Flower Match
- **Quiz subtitle:** Discover whether ready-to-ship flowers or a bespoke design will bring your floral wedding cake vision to life — you're 5 questions away from the answer!
- **Possible outcomes:**
  - Ready to Ship Sugar Flowers
  - Made to Order Sugar Flowers
  - Curated Sugar Flower Arrangements
  - Fully Custom Sugar Flower Design

---

## Questions + Answer Options

### 1) When is your wedding?
- **Less than 6 weeks away** (`urgent`)
- **6–12 weeks away** (`soon`)
- **3–6 months away** (`planning`)
- **More than 6 months away** (`longterm`)

### 2) What role best describes you?
- **Baker/cake decorator (I'm placing the flowers on the cake)** (`baker`)
- **Wedding vendor (planner, venue coordinator, florist, etc.)** (`vendor`)
- **I'm getting married** (`couple`)
- **Family member/friend helping the wedding couple** (`family`)

### 3) How familiar are you with using sugar flowers?
- **Very familiar — I've worked with sugar flowers before** (`pro`)
- **Somewhat familiar — I've used them, but I still have questions** (`amateur`)
- **New to sugar flowers — I want clear guidance** (`novice`)

### 4) How specific is your cake flower vision?
- **I want you to design something totally unique for my cake** (`custom`)
- **I'm open to your existing designs** (`existing`)
- **I love your designs, I just need some changes to match my color palette** (`adjusted`)

### 5) What's your budget range?
- **Under $150** (`low`)
- **$150 - $500** (`medium`)
- **$500+** (`high`)
- **$1000+** (`premium`)

---

## Results Page Copy (by Outcome)

## 1) Ready to Ship Sugar Flowers
- **Summary:** In-stock toppers that arrive in days so you can finish your cake without waiting.
- **Best for:** Fast timelines and anyone who wants something beautiful without customization.
- **What You Get:**
  - Ships in 1–2 business days (in stock)
  - Customization: Pre-designed styles with no changes needed
  - Support: Quick-start placement tips included
  - Durability: Sugar flowers stay pristine — they won't wilt
  - No order minimums — great for small cakes
- **Upsell:** Want extra support styling your cake? Add the Styling Toolkit as an optional add-on for Ready to Ship orders.
- **Next step copy:** These are in stock and ship fast — perfect if your date is coming up soon.
- **Primary CTA destination:** https://sugarflowersonline.com/collections/all

## 2) Made to Order Sugar Flowers
- **Summary:** Custom-colored individual flowers made for pros who already know the flowers they need.
- **Best for:** Bakers who want their chosen flowers in exact colors with a planned lead time.
- **What You Get:**
  - Lead time: Minimum 6 weeks, made fresh for your order
  - Customization: Choose the flower types and colors you need
  - Support: Optional guides for pro placement
  - Durability: Made well in advance so they're ready when you are
  - Order minimum: $150
- **Upsell:** Did you know? Your order includes access to Styling Toolkit for design ideas, layout tips, and checklists.
- **Next step copy:** Choose your flowers and colors, and we'll make them to order for you.
- **Primary CTA destination:** https://kelsiecakes.com/shop-all/

## 3) Curated Sugar Flower Arrangements
- **Summary:** Coordinated flower sets that deliver a styled, done-for-you look for your cake.
- **Best for:** Couples or helpers who want a polished design without planning every stem.
- **What You Get:**
  - Lead time: Minimum 6 weeks for arranged sets
  - Customization: Curated designs with light tweaks available
  - Support: Styling guidance and placement tips on request
  - Durability: Won't wilt, bruise, or expire
  - Order minimum: $150
- **Upsell:** Every curated arrangement includes access to the Styling Toolkit for layout inspiration and placement templates.
- **Next step copy:** These take the guesswork out and still feel custom.
- **Primary CTA destination:** https://kelsiecakes.com/bundles/

## 4) Fully Custom Sugar Flower Design
- **Summary:** Collaborative design experience to build a one-of-a-kind floral cake centerpiece.
- **Best for:** Couples and vendors who want signature details and white-glove support.
- **What You Get:**
  - Lead time: typically couples book this 3–6 months before the wedding but rush options are available exclusively for custom designs
  - Customization: Unlimited design and palette control
  - Support: High-touch collaboration and consultation
  - Durability: Ships safely and stays pristine for your event
  - Minimum: $500 with white-glove delivery options
- **Upsell:** Fully custom projects include access to the Styling Toolkit so you have design guides and placement templates for your hero arrangement.
- **Next step copy:** Start with the inquiry form so I can check availability for your event date before we dive into design details.
- **Primary CTA destination:** https://kelsiecakes.com/inquire-here
- **Secondary CTA (only on Fully Custom):** Schedule a call → https://kelsiecakes.com/call/

---

## Shared Results-Page Copy (Shown for Any Outcome)

- **Header label:** “Your perfect match”
- **Section title:** “What You Get:”
- **Email capture prompt:** “Want these links + next steps sent to your email?”
- **Email helper text:** “I’ll send your results + helpful tips. Unsubscribe anytime.”
- **Submit button:** “Send Me My Results”
- **Retake button:** “Retake Quiz”

---

## Role-Based Blurbs Added to “Best for”

Depending on role + final result, the quiz appends a role-specific sentence on the results page.

### Baker
- Ready to Ship: “You can pop these on a cake fast. Minimal fuss, maximum payoff.”
- Made to Order: “You choose the flower types; I’ll make them in your palette.”
- Curated: “You want a great look without designing from scratch. Love that for you.”
- Fully Custom: “If you want a hero arrangement and you don’t want to think about it, this is the move.”

### Couple
- Ready to Ship: “Fast + gorgeous. Great when you just need a pretty answer right now.”
- Curated: “This is your “I want it to look designed, but I don’t want to design it” option.”
- Fully Custom: “We’ll design something unique together. This is the full concierge route.”

### Vendor
- Ready to Ship: “A clean solution when the timeline is tight and you need something reliable.”
- Curated: “A styled option you can confidently recommend without guessing flower combos.”
- Fully Custom: “Best when the couple wants a signature detail and you want it handled professionally.”

### Family / Friend
- Ready to Ship: “Quick win: beautiful, fast, and no complicated decisions.”
- Curated: “This is the easiest way to get a pulled-together look.”
- Fully Custom: “If this is a big sentimental detail, custom is the safest bet.”

---

## How Scores Are Calculated (Brief Explanation)

The quiz first assigns point values from each selected answer into four buckets:
- `readyToShip`
- `madeToOrder`
- `curated`
- `fullyCustom`

Then it applies business rules (guardrails), which can override pure point totals:

1. **Low budget override:** If budget is `low`, result is immediately **Ready to Ship**.
2. **Urgent timeline override:** If timeline is `urgent` (<6 weeks), result is immediately **Ready to Ship**.
3. **High budget + short timeline:** If budget is `high` or `premium`, timeline is `soon`, and customization is not `existing`, result is **Fully Custom**.
4. **Budget gate for Fully Custom:** If budget is not `high/premium`, **Fully Custom** is removed from eligible outcomes.
5. **Existing-design preference:** If customization is `existing`, user is not routed to Fully Custom; outcome is chosen from a narrower set.
6. **Made-to-Order restriction:** Non-bakers (or novice users) cannot be routed into **Made to Order**.
7. **Tie-breaker priority:** If scores tie, the priority order is:
   1) Fully Custom
   2) Curated
   3) Made to Order
   4) Ready to Ship

In short: it’s a weighted-score quiz with clear routing rules to keep recommendations realistic based on timeline, budget, role, and customization intent.
