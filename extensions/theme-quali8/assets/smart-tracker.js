/*
 * Quali8 — Smart recs tracker (app embed).
 *
 * localStorage keys shared with smart-recommendations.js:
 *   q8-viewed      JSON array, newest first, max 12:
 *                  [{ id: "123", collections: ["4", "5"], at: 1690000000000 }]
 *   q8-first-seen  "YYYY-MM-DD" (browser local date) of the first visit.
 * Every storage access is wrapped in try/catch (private mode, blocked
 * storage). Nothing is sent to the network.
 */
(function () {
  var VIEWED_KEY = "q8-viewed";
  var FIRST_SEEN_KEY = "q8-first-seen";
  var MAX_VIEWED = 12;

  var node = document.querySelector("[data-quali8-tracker]");
  if (!node) return;

  function readJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* private mode */
    }
  }

  function localDate() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    return d.getFullYear() + "-" + (m.length === 1 ? "0" + m : m) + "-" + (day.length === 1 ? "0" + day : day);
  }

  // First visit date, stored once.
  var firstSeen = null;
  try {
    firstSeen = window.localStorage.getItem(FIRST_SEEN_KEY);
  } catch (e) {
    /* private mode */
  }
  if (!firstSeen) write(FIRST_SEEN_KEY, localDate());

  // Product views.
  var productId = node.getAttribute("data-product-id");
  if (!productId || !/^\d+$/.test(productId)) return;

  var collections = (node.getAttribute("data-collection-ids") || "")
    .split(",")
    .map(function (id) { return id.trim(); })
    .filter(function (id) { return /^\d+$/.test(id); });

  var viewed = readJson(VIEWED_KEY, []);
  if (!Array.isArray(viewed)) viewed = [];
  viewed = viewed.filter(function (entry) {
    return entry && String(entry.id) !== productId;
  });
  viewed.unshift({ id: productId, collections: collections, at: Date.now() });
  write(VIEWED_KEY, JSON.stringify(viewed.slice(0, MAX_VIEWED)));
})();
