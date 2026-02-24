/**
 * Quiz GTM iframe bridge
 *
 * Add this script to any page that embeds the quiz in an <iframe>.
 * It listens for analytics events posted by the quiz and forwards them
 * to window.dataLayer so Google Tag Manager picks them up automatically.
 *
 * SECURITY: Messages are only forwarded from explicitly trusted origins.
 * You MUST configure at least one trusted origin or no events will be
 * forwarded (a warning will appear in the browser console at page load).
 *
 * ─── CONFIGURATION ────────────────────────────────────────────────────
 *
 * Option 1 — Set a global variable BEFORE this script tag (recommended):
 *
 *   <script>
 *     window.QUIZ_TRUSTED_ORIGINS = ['https://your-quiz-domain.com'];
 *   </script>
 *   <script src="https://your-quiz-domain.com/gtm-iframe-bridge.js"></script>
 *
 * Option 2 — data-quiz-origin attribute on this script tag:
 *
 *   <script
 *     src="https://your-quiz-domain.com/gtm-iframe-bridge.js"
 *     data-quiz-origin="https://your-quiz-domain.com"></script>
 *
 *   Multiple origins (comma-separated):
 *   data-quiz-origin="https://quiz.example.com, https://staging.quiz.example.com"
 *
 * Note: If you inline this script rather than loading it via src, use
 * Option 1 only — document.currentScript is null in inline script blocks.
 *
 * ─── EVENTS FORWARDED ─────────────────────────────────────────────────
 *   quiz_start   — visitor clicks "Start Quiz"
 *   quiz_answer  — visitor selects an answer  (includes question_id, answer_value)
 *   quiz_result  — result screen shown         (includes event_label with result key)
 */

(function () {
  'use strict';

  // ── 1. Resolve trusted origins ────────────────────────────────────────
  //
  // Origins are lowercased and trailing slashes stripped so that
  // "https://example.com" and "https://example.com/" match equally.

  function normalizeOrigin(raw) {
    return String(raw).toLowerCase().replace(/\/+$/, '');
  }

  var trustedOrigins = [];

  if (window.QUIZ_TRUSTED_ORIGINS && window.QUIZ_TRUSTED_ORIGINS.length) {
    // Option 1: array set by page author before this script tag.
    for (var i = 0; i < window.QUIZ_TRUSTED_ORIGINS.length; i++) {
      trustedOrigins.push(normalizeOrigin(window.QUIZ_TRUSTED_ORIGINS[i]));
    }
  } else {
    // Option 2: data-quiz-origin attribute on the <script> element.
    // document.currentScript is available because this script runs
    // synchronously (no defer/async).
    var scriptEl = document.currentScript;
    if (scriptEl) {
      var attrValue = scriptEl.getAttribute('data-quiz-origin');
      if (attrValue) {
        var parts = attrValue.split(',');
        for (var j = 0; j < parts.length; j++) {
          var part = parts[j].trim();
          if (part) {
            trustedOrigins.push(normalizeOrigin(part));
          }
        }
      }
    }
  }

  // Warn once at setup if no origins are configured.
  // Placed here (not inside the handler) to avoid console spam if an
  // attacker floods the bridge with messages.
  if (trustedOrigins.length === 0) {
    console.warn(
      '[quiz-bridge] No trusted origins configured. ' +
      'Quiz analytics will NOT be forwarded to dataLayer. ' +
      "Set window.QUIZ_TRUSTED_ORIGINS = ['https://your-quiz-domain.com'] " +
      'before this script tag, or add a data-quiz-origin attribute to the ' +
      '<script> tag. See the file header for full instructions.'
    );
  }

  // ── 2. Message handler ────────────────────────────────────────────────

  window.addEventListener('message', function (event) {
    var data = event.data;

    // Fast path: ignore anything that isn't a quiz analytics message.
    // This exits before the origin check to avoid unnecessary work for
    // the many non-quiz postMessage events present on any page.
    if (!data || data.type !== 'quiz_analytics' || !data.event) {
      return;
    }

    // ── 2a. Origin validation ──────────────────────────────────────────
    //
    // event.origin is the string "null" for sandboxed iframes and
    // file:// pages — never a legitimate quiz deployment; always reject.
    // For all other origins require an exact match (after normalization).
    // Wildcard subdomain matching is intentionally not supported: it
    // cannot be implemented safely as a simple string comparison.

    var incomingOrigin = event.origin;

    if (!incomingOrigin || incomingOrigin === 'null') {
      return;
    }

    var normalizedIncoming = normalizeOrigin(incomingOrigin);
    var originTrusted = false;

    for (var k = 0; k < trustedOrigins.length; k++) {
      if (normalizedIncoming === trustedOrigins[k]) {
        originTrusted = true;
        break;
      }
    }

    if (!originTrusted) {
      // Reject silently — no per-message logging to avoid console spam.
      return;
    }

    // ── 2b. Source validation ──────────────────────────────────────────
    //
    // Verify the sender is an actual <iframe> in the page DOM.
    // This is a second defence layer: even a script running on the
    // trusted origin cannot spoof quiz events because it is not an iframe.
    //
    // Iframes are queried at message-receipt time (not cached at load)
    // so late-mounted quiz iframes are always found.
    // The === comparison on contentWindow is safe across origins —
    // JavaScript object identity does not require same-origin access.

    var sourceIsKnownIframe = false;

    if (document && document.getElementsByTagName) {
      var iframes = document.getElementsByTagName('iframe');
      for (var m = 0; m < iframes.length; m++) {
        try {
          if (event.source === iframes[m].contentWindow) {
            sourceIsKnownIframe = true;
            break;
          }
        } catch (e) {
          // Some sandboxing configurations may throw on contentWindow
          // access; skip this iframe and continue.
        }
      }
    } else {
      // DOM access unavailable — fall back to origin-only validation.
      sourceIsKnownIframe = true;
    }

    if (!sourceIsKnownIframe) {
      // Correct origin but not from an iframe — likely a script calling
      // postMessage directly. Reject silently.
      return;
    }

    // ── 2c. Build and push the dataLayer payload ───────────────────────

    var push = { event: data.event };
    Object.keys(data).forEach(function (key) {
      if (key !== 'type' && key !== 'event') {
        push[key] = data[key];
      }
    });

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(push);
  });

})();
