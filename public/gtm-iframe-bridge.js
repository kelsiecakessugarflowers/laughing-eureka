/**
 * Quiz GTM iframe bridge
 *
 * Add this script to any page that embeds the quiz in an <iframe>.
 * It listens for analytics events posted by the quiz and forwards them
 * to window.dataLayer so Google Tag Manager picks them up automatically.
 *
 * Events forwarded:
 *   quiz_start   — visitor clicks "Start Quiz"
 *   quiz_answer  — visitor selects an answer  (includes question_id, answer_value)
 *   quiz_result  — result screen shown         (includes event_label with result key)
 *
 * Usage — paste inside a Code Block / Custom HTML section on your page:
 *
 *   <script src="https://<your-quiz-domain>/gtm-iframe-bridge.js"></script>
 *
 * Or inline the contents directly into a <script> tag if you prefer.
 */

(function () {
  'use strict';

  window.addEventListener('message', function (event) {
    var data = event.data;

    // Ignore anything that isn't a quiz analytics message.
    if (!data || data.type !== 'quiz_analytics' || !data.event) {
      return;
    }

    // Build the dataLayer payload: event name + all extra fields.
    var push = { event: data.event };
    Object.keys(data).forEach(function (key) {
      if (key !== 'type' && key !== 'event') {
        push[key] = data[key];
      }
    });

    // Ensure dataLayer exists, then push.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(push);
  });
})();
