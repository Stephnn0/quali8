/*
 * Quali8 — Delivery checkout (cart page): a four-step pre-checkout.
 *
 * 1. Sender information: sender (email, name, phone) + recipient (name, phone),
 *    or "sending to myself" which reuses the sender. Phones are validated.
 * 2. Delivery / Pickup.  Delivery checks the zip against the app's zones,
 *    then a date (when the merchant's calendar is on), an optional timed
 *    delivery window (a surcharge the carrier adds to the rate — it travels
 *    as a hidden line item property), and the address (location type,
 *    street, city, state, country). Pickup offers the pickup calendar and
 *    skips the address. Same-day rules run on the shop's clock, not the
 *    shopper's.
 * 3. Options (merchant can switch the step, or any field, off): occasion —
 *    picking one shows that occasion's products with one-tap add — card
 *    message, notes (also the cart note), "if nobody answers the door", and
 *    the Smart Recommendations upsell rail.
 * 4. Review & Checkout.  A summary and the Checkout button, which opens
 *    Shopify checkout with the recipient's shipping address prefilled
 *    through the documented `checkout[...]` URL parameters.
 *
 * An empty cart shows a "keep shopping" panel instead of the steps.
 *
 * Every field is saved to cart attributes (debounced) so it reaches the
 * order. While the summary isn't complete the theme's own checkout and
 * express-payment buttons are hidden. All DOM built with createElement.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var ZIP_KEY = "q8-bar-zip"; // shared with the header bar's checker
  var SAVE_DELAY = 600;
  var BLOCKED_CLASS = "q8-dc-blocked";

  var block = document.querySelector("[data-quali8-delivery-checkout]");
  if (!block) return;

  var ATTR = {
    method: "Delivery method",
    senderEmail: "Sender email",
    senderFirst: "Sender first name",
    senderLast: "Sender last name",
    senderPhone: "Sender phone",
    self: "Sending to self",
    recipientFirst: "Recipient first name",
    recipientLast: "Recipient last name",
    recipientPhone: "Recipient phone",
    locationType: "Delivery location type",
    zip: "Delivery zip",
    zone: "Delivery zone",
    price: "Delivery price",
    address1: "Delivery address",
    address2: "Delivery address 2",
    city: "Delivery city",
    province: "Delivery province",
    country: "Delivery country",
    date: "Delivery date",
    pickupDate: "Pickup date",
    timed: "Timed delivery",
    timedCode: "_Timed delivery code",
    cardMessage: "Gift message", // same keys as the gift-notes block
    notes: "Special instructions",
    occasion: "Occasion",
    door: "If nobody answers the door",
  };
  var NOTE_KEY = "__note"; // pending-save marker for the cart note
  var TIMED_PROPERTY = "_Timed delivery"; // line item property read by the carrier callback

  var US_STATES = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
    CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
    KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
    MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
    NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
    NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
    OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
    VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
    PR: "Puerto Rico",
  };
  var CA_PROVINCES = {
    AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick",
    NL: "Newfoundland and Labrador", NS: "Nova Scotia", NT: "Northwest Territories",
    NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec",
    SK: "Saskatchewan", YT: "Yukon",
  };
  var COUNTRIES = [
    ["US", "United States"], ["CA", "Canada"], ["GB", "United Kingdom"], ["AU", "Australia"],
    ["NZ", "New Zealand"], ["IE", "Ireland"], ["MX", "Mexico"], ["DE", "Germany"],
    ["FR", "France"], ["ES", "Spain"], ["IT", "Italy"], ["NL", "Netherlands"],
    ["BE", "Belgium"], ["PT", "Portugal"], ["CH", "Switzerland"], ["AT", "Austria"],
    ["SE", "Sweden"], ["NO", "Norway"], ["DK", "Denmark"], ["FI", "Finland"],
    ["PL", "Poland"], ["CZ", "Czechia"], ["GR", "Greece"], ["BR", "Brazil"],
    ["AR", "Argentina"], ["CL", "Chile"], ["CO", "Colombia"], ["PE", "Peru"],
    ["JP", "Japan"], ["KR", "South Korea"], ["SG", "Singapore"], ["HK", "Hong Kong"],
    ["IN", "India"], ["AE", "United Arab Emirates"], ["ZA", "South Africa"], ["IL", "Israel"],
    ["PR", "Puerto Rico"], ["DO", "Dominican Republic"], ["CR", "Costa Rica"], ["PA", "Panama"],
  ];

  var ICONS = {
    check: "M 3.5 8.5 L 6.5 11.5 L 12.5 4.5",
    user: "M 8 8 a 3 3 0 1 0 0 -6 a 3 3 0 0 0 0 6 z M 2.5 14 c 0 -3 2.5 -4.5 5.5 -4.5 s 5.5 1.5 5.5 4.5",
    truck: "M 1.5 4 h 8 v 7 h -8 z M 9.5 6.5 h 3 l 2 2.5 v 2 h -5 z M 4 12.5 a 1 1 0 1 0 0.01 0 M 12 12.5 a 1 1 0 1 0 0.01 0",
    store: "M 2 6 l 1.5 -3.5 h 9 L 14 6 M 2.5 6 v 7.5 h 11 V 6 M 6 13.5 v -4 h 4 v 4",
    card: "M 2 4.5 h 12 v 7.5 h -12 z M 2 7 h 12 M 4.5 10 h 3",
    pin: "M 8 14 s -4.5 -4 -4.5 -7.5 a 4.5 4.5 0 0 1 9 0 C 12.5 10 8 14 8 14 z M 8 8 a 1.5 1.5 0 1 0 0.01 0",
    tag: "M 2 2.5 h 5.5 l 6 6 l -5 5 l -6 -6 z M 5 5.5 a 0.5 0.5 0 1 0 0.01 0",
    calendar: "M 2.5 4 h 11 v 9.5 h -11 z M 2.5 7 h 11 M 5.5 2.5 v 3 M 10.5 2.5 v 3",
    clock: "M 8 2.5 a 5.5 5.5 0 1 0 0 11 a 5.5 5.5 0 1 0 0 -11 z M 8 5 v 3.2 l 2.2 1.4",
    gift: "M 2.5 7 h 11 v 6.5 h -11 z M 8 7 v 6.5 M 2 4.5 h 12 v 2.5 h -12 z M 8 4.5 c -1 -2 -3.5 -2.5 -3.5 -1 s 2 1 3.5 1 c 1 -2 3.5 -2.5 3.5 -1 s -2 1 -3.5 1",
    bag: "M 3 5.5 h 10 l -0.8 8 h -8.4 z M 5.5 5.5 v -1 a 2.5 2.5 0 0 1 5 0 v 1",
  };

  // --- Utilities -------------------------------------------------------------

  function readJson(selector) {
    var node = block.querySelector(selector);
    try {
      return JSON.parse((node && node.textContent) || "null");
    } catch (e) {
      return null;
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(name, size) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    if (size) {
      svg.setAttribute("width", size);
      svg.setAttribute("height", size);
    }
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", ICONS[name] || "");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.6");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function storageSet(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
      /* private browsing */
    }
  }

  function formatMoney(amount, currency) {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || "en", {
        style: "currency",
        currency: currency || "USD",
      }).format(amount);
    } catch (e) {
      return "$" + Number(amount).toFixed(2);
    }
  }

  function fill(template, values) {
    return String(template || "").replace(/\{(\w+)\}/g, function (_, key) {
      return values[key] != null ? values[key] : "";
    });
  }

  var emailOk = function (value) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value || "");
  };

  // 7–15 digits once separators are stripped; an optional leading "+".
  function phoneOk(value) {
    var raw = String(value || "").trim();
    if (!raw) return false;
    if (!/^\+?[0-9 ().-]+$/.test(raw)) return false;
    var digits = raw.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }

  // --- Calendar rules (mirror of app/services/delivery/deliverySchedule.ts) --

  function isoToday() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function localTime() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  // The shop's date and time (mirror of app/services/delivery/shopTime.ts):
  // derived from its zone when the browser can, else what the server sent,
  // else the shopper's own clock.
  function shopClock() {
    var clock = (schedule && schedule.clock) || {};
    if (clock.timezone) {
      try {
        var parts = new Intl.DateTimeFormat("en-US", { timeZone: clock.timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date());
        var get = function (type) {
          var part = parts.filter(function (x) { return x.type === type; })[0];
          return part ? part.value : "00";
        };
        var hour = get("hour") === "24" ? "00" : get("hour");
        return { timezone: clock.timezone, date: get("year") + "-" + get("month") + "-" + get("day"), time: hour + ":" + get("minute") };
      } catch (e) {
        /* zone unknown to this browser — fall through */
      }
    }
    if (clock.date && clock.time) return { timezone: clock.timezone || "", date: clock.date, time: clock.time };
    return { timezone: "", date: isoToday(), time: localTime() };
  }
  function minutesOf(hhmm) {
    var m = /^(\d{2}):(\d{2})$/.exec(hhmm || "");
    return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
  }
  function formatTime12(hhmm) {
    var mins = minutesOf(hhmm);
    if (mins < 0) return hhmm || "";
    var h = Math.floor(mins / 60), m = mins % 60;
    return (h % 12 === 0 ? 12 : h % 12) + ":" + String(m).padStart(2, "0") + " " + (h >= 12 ? "PM" : "AM");
  }
  // "open" until the cutoff, "closed" after it, "off" when today isn't offered.
  function todayStatus(rules, now) {
    if (!rules) return "open";
    if (rules.todayEnabled === false) return "off";
    if (!rules.todayCutoff || minutesOf(now) < 0) return "open";
    return minutesOf(now) >= minutesOf(rules.todayCutoff) ? "closed" : "open";
  }
  function isoParts(iso) {
    var p = String(iso || "").split("-").map(Number);
    return p.length === 3 && p.every(function (n) { return !isNaN(n); }) ? p : null;
  }
  function isoAddDays(iso, days) {
    var p = isoParts(iso);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + days)).toISOString().slice(0, 10);
  }
  function isoDaysBetween(from, to) {
    var a = isoParts(from), b = isoParts(to);
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
  }
  function isoWeekday(iso) {
    var p = isoParts(iso);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  }
  function dateAllowed(rules, iso, today, now) {
    if (!rules || !isoParts(iso)) return false;
    var offset = isoDaysBetween(today, iso);
    if (offset < (rules.leadDays || 0) || offset > (rules.maxDaysAhead == null ? 60 : rules.maxDaysAhead)) return false;
    if (offset === 0 && todayStatus(rules, now) !== "open") return false;
    if ((rules.blockedWeekdays || []).indexOf(isoWeekday(iso)) !== -1) return false;
    if ((rules.blockedDates || []).indexOf(iso) !== -1) return false;
    return true;
  }
  function firstAllowed(rules, today, now) {
    var max = rules.maxDaysAhead == null ? 60 : rules.maxDaysAhead;
    for (var i = rules.leadDays || 0; i <= max; i += 1) {
      var candidate = isoAddDays(today, i);
      if (dateAllowed(rules, candidate, today, now)) return candidate;
    }
    return null;
  }
  function prettyDate(iso) {
    var p = isoParts(iso);
    if (!p) return "";
    try {
      return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString(document.documentElement.lang || "en", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    } catch (e) {
      return iso;
    }
  }

  // --- Data ------------------------------------------------------------------

  function checkZip(zip) {
    return fetch(ROOT + "apps/quali8/delivery-check?zip=" + encodeURIComponent(zip), {
      headers: { Accept: "application/json" },
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function fetchJson(path) {
    return fetch(ROOT + path, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }
  function fetchSchedule() {
    return fetchJson("apps/quali8/delivery-schedule");
  }
  function fetchOccasions() {
    return fetchJson("apps/quali8/recommendations?limit=1&fallback=0").then(function (data) {
      return (data && data.occasions) || [];
    });
  }
  function fetchOccasionProducts(slug) {
    var params = new URLSearchParams();
    params.set("occasion", slug);
    params.set("fallback", "0");
    params.set("limit", "8");
    return fetchJson("apps/quali8/recommendations?" + params.toString());
  }
  function fetchRecommendations(cart) {
    var ids = (cart.items || []).map(function (item) { return item.product_id; }).filter(Boolean);
    var params = new URLSearchParams();
    params.set("cart", ids.join(","));
    params.set("total", String((cart.items_subtotal_price || 0) / 100));
    params.set("limit", "6");
    return fetchJson("apps/quali8/smart-recommendations?" + params.toString());
  }
  function addVariant(variantId) {
    var body = new FormData();
    body.append("id", String(variantId).split("/").pop());
    body.append("quantity", "1");
    return fetch(ROOT + "cart/add.js", { method: "POST", headers: { Accept: "application/json" }, body: body }).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok) throw new Error((payload && (payload.description || payload.message)) || "HTTP " + response.status);
        return payload;
      });
    });
  }
  function reloadCart() {
    return fetchJson("cart.js").then(function (cart) {
      cartData = cart;
      return cart;
    });
  }

  var saveTimer = null;
  var inflight = false;
  var queued = false;
  var pending = {};
  var statusNode = null;
  var settings = {};

  function save(patch) {
    Object.keys(patch).forEach(function (key) {
      pending[key] = patch[key] == null ? "" : String(patch[key]);
    });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, SAVE_DELAY);
  }

  function flush() {
    if (inflight) {
      queued = true;
      return;
    }
    if (!Object.keys(pending).length) return;
    var payload = { attributes: pending };
    if (Object.prototype.hasOwnProperty.call(pending, NOTE_KEY)) {
      payload.note = pending[NOTE_KEY];
      delete pending[NOTE_KEY];
    }
    pending = {};
    inflight = true;
    fetch(ROOT + "cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function () {
        if (statusNode) {
          statusNode.textContent = settings.savedLabel || "Saved";
          statusNode.hidden = false;
        }
      })
      .catch(function () {
        /* the address still travels in the checkout URL */
      })
      .then(function () {
        inflight = false;
        if (queued) {
          queued = false;
          flush();
        }
      });
  }

  // --- Gate for the theme's own checkout buttons ------------------------------

  function installGate() {
    if (settings.hideThemeCheckout === false) return;
    var selector = settings.checkoutSelector || "";
    if (!selector.trim()) return;
    var style = document.createElement("style");
    style.textContent =
      selector
        .split(",")
        .map(function (part) {
          return "html." + BLOCKED_CLASS + " " + part.trim();
        })
        .join(",\n") + " { display: none !important; }";
    document.head.appendChild(style);
  }

  function setBlocked(blocked) {
    document.documentElement.classList.toggle(BLOCKED_CLASS, blocked);
  }

  // --- Form helpers ----------------------------------------------------------

  function field(opts) {
    var wrap = el("div", "q8-dc__field" + (opts.half ? " q8-dc__field--half" : ""));
    var label = el("label", "q8-dc__label", opts.label);
    if (opts.optional) label.appendChild(el("span", "q8-dc__optional", " (optional)"));
    label.htmlFor = opts.id;
    wrap.appendChild(label);
    var control;
    if (opts.options) {
      control = document.createElement("select");
      opts.options.forEach(function (option) {
        var node = document.createElement("option");
        node.value = option[0];
        node.textContent = option[1];
        if (option[0] === (opts.value || "")) node.selected = true;
        control.appendChild(node);
      });
    } else if (opts.textarea) {
      control = document.createElement("textarea");
      control.rows = opts.rows || 3;
      control.value = opts.value || "";
      if (opts.placeholder) control.placeholder = opts.placeholder;
      if (opts.maxLength) control.maxLength = opts.maxLength;
    } else {
      control = document.createElement("input");
      control.type = opts.type || "text";
      control.value = opts.value || "";
      if (opts.placeholder) control.placeholder = opts.placeholder;
    }
    control.id = opts.id;
    control.className = "q8-dc__input";
    if (opts.autocomplete) control.setAttribute("autocomplete", opts.autocomplete);
    if (opts.readOnly) control.readOnly = true;
    control.addEventListener("input", opts.onChange);
    control.addEventListener("change", opts.onChange);
    wrap.appendChild(control);
    var error = el("p", "q8-dc__error");
    error.hidden = true;
    wrap.appendChild(error);
    return {
      wrap: wrap,
      control: control,
      setError: function (message) {
        error.textContent = message || "";
        error.hidden = !message;
        control.classList.toggle("q8-dc__input--invalid", Boolean(message));
        control.setAttribute("aria-invalid", message ? "true" : "false");
      },
    };
  }

  function provinceOptions(country) {
    var map = country === "US" ? US_STATES : country === "CA" ? CA_PROVINCES : null;
    if (!map) return null;
    return [["", "—"]].concat(
      Object.keys(map).map(function (code) {
        return [code, map[code]];
      }),
    );
  }

  function toggle(labelText, checked, onChange) {
    var label = el("label", "q8-dc__toggle");
    var input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.className = "q8-dc__toggle-input";
    var track = el("span", "q8-dc__toggle-track");
    track.appendChild(el("span", "q8-dc__toggle-thumb"));
    label.appendChild(input);
    label.appendChild(track);
    label.appendChild(el("span", "q8-dc__toggle-label", labelText));
    input.addEventListener("change", function () {
      onChange(input.checked);
    });
    return label;
  }

  function primaryButton(text, onClick) {
    var button = el("button", "q8-dc__primary", text);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  }

  function linkButton(text, onClick, className) {
    var button = el("button", className || "q8-dc__link", text);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  }

  // --- State -----------------------------------------------------------------

  var state;
  var main;
  var stepsNav;
  var orderCard;
  var currency;
  var defaultCountry;
  var checkerOn = true;
  var schedule = null; // merchant calendar rules, null until fetched
  var today = isoToday(); // the shop's date once the schedule (with its clock) is in
  var now = localTime(); // the shop's HH:MM, same story
  function tick() {
    var clock = shopClock();
    today = clock.date;
    now = clock.time;
    return clock;
  }

  function rulesFor(method) {
    if (!schedule || !schedule.enabled) return null;
    return method === "pickup" ? schedule.pickup : schedule.delivery;
  }
  // What the Options step shows — from the merchant's Delivery page; everything on until it loads.
  var DEFAULT_OPTIONS_CONFIG = { enabled: true, occasionEnabled: true, cardMessageEnabled: true, notesEnabled: true, notesLabel: "", doorEnabled: true };
  function optionsConfig() {
    return (schedule && schedule.options) || DEFAULT_OPTIONS_CONFIG;
  }
  function optionsOn() {
    return optionsConfig().enabled !== false;
  }
  function stepAfterMethod() {
    return optionsOn() ? 3 : 4;
  }

  function initialState(attributes) {
    var a = function (key) {
      return attributes[ATTR[key]] || "";
    };
    var customerEmail = block.dataset.customerEmail || "";
    return {
      step: 1,
      sender: {
        email: a("senderEmail") || customerEmail,
        firstName: a("senderFirst") || block.dataset.customerFirst || "",
        lastName: a("senderLast") || block.dataset.customerLast || "",
        phone: a("senderPhone"),
      },
      self: a("self") === "Yes",
      recipient: {
        firstName: a("recipientFirst"),
        lastName: a("recipientLast"),
        phone: a("recipientPhone"),
      },
      method: a("method") === "Pickup" ? "pickup" : a("method") === "Delivery" ? "delivery" : null,
      locationType: a("locationType"),
      zip: a("zip") || (settings.method.rememberZip !== false ? storageGet(ZIP_KEY) : "") || "",
      zone: null,
      deliverable: false,
      address: {
        address1: a("address1"),
        address2: a("address2"),
        city: a("city"),
        province: a("province"),
        country: (a("country") || defaultCountry || "US").toUpperCase(),
      },
      dates: { delivery: a("date"), pickup: a("pickupDate") },
      timed: a("timedCode"), // a window code ("before:12:00"), re-validated once the schedule is in
      options: {
        cardMessage: a("cardMessage"),
        notes: a("notes"),
        occasion: a("occasion"),
        door: a("door"),
      },
      done: { 1: false, 2: false, 3: false },
    };
  }

  function dateValid(method) {
    var rules = rulesFor(method);
    if (!rules) return true;
    var chosen = state.dates[method];
    if (!chosen) return schedule.requireDate === false;
    tick();
    return dateAllowed(rules, chosen, today, now);
  }

  // --- Timed delivery ----------------------------------------------------------

  function timeWindows() {
    return (schedule && schedule.timeWindows) || [];
  }
  function timedWindow() {
    if (state.method !== "delivery" || !state.timed) return null;
    return timeWindows().filter(function (w) { return w.code === state.timed; })[0] || null;
  }
  function timedLabel(w) {
    return w.label + (w.price > 0 ? " (+" + formatMoney(w.price, currency) + ")" : "");
  }

  // The carrier callback only sees line items, so the picked window rides on
  // the first line as a hidden property (underscore = not shown at checkout).
  var timedSyncing = false;
  var timedSyncQueued = false;
  function syncTimedProperty() {
    if (!cartData || !cartData.items || !cartData.items.length) return Promise.resolve();
    if (timedSyncing) {
      timedSyncQueued = true;
      return Promise.resolve();
    }
    var wanted = timedWindow() ? state.timed : "";
    var changes = [];
    cartData.items.forEach(function (item, index) {
      var props = item.properties || {};
      var has = Object.prototype.hasOwnProperty.call(props, TIMED_PROPERTY) ? String(props[TIMED_PROPERTY] || "") : "";
      var target = index === 0 ? wanted : "";
      if (has === target) return;
      var next = {};
      Object.keys(props).forEach(function (key) {
        if (key !== TIMED_PROPERTY) next[key] = props[key];
      });
      if (target) next[TIMED_PROPERTY] = target;
      changes.push({ id: item.key, quantity: item.quantity, properties: next });
    });
    if (!changes.length) return Promise.resolve();
    timedSyncing = true;
    var chain = Promise.resolve();
    changes.forEach(function (change) {
      chain = chain.then(function () {
        return fetch(ROOT + "cart/change.js", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(change),
        }).then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        });
      });
    });
    return chain
      .then(function () {
        return reloadCart();
      })
      .catch(function () {
        /* the attribute still records the choice for the merchant */
      })
      .then(function () {
        timedSyncing = false;
        renderOrder();
        if (timedSyncQueued) {
          timedSyncQueued = false;
          return syncTimedProperty();
        }
      });
  }

  function recipientName() {
    var who = state.self ? state.sender : state.recipient;
    return ((who.firstName || "") + " " + (who.lastName || "")).trim();
  }

  function recipientPhone() {
    return state.self ? state.sender.phone : state.recipient.phone;
  }

  function phoneValid(value) {
    if (!value) return settings.sender.requirePhone === false;
    return phoneOk(value);
  }

  function senderValid() {
    var s = state.sender;
    if (!emailOk(s.email) || !s.firstName || !s.lastName) return false;
    if (!phoneValid(s.phone)) return false;
    if (!state.self) {
      var r = state.recipient;
      if (!r.firstName || !r.lastName) return false;
      if (!phoneValid(r.phone)) return false;
    }
    return true;
  }

  function addressValid() {
    var a = state.address;
    if (!a.address1 || !a.city || !a.country) return false;
    if (provinceOptions(a.country) && !a.province) return false;
    return true;
  }

  function methodValid() {
    if (state.method === "pickup") return settings.method.pickupEnabled !== false && dateValid("pickup");
    if (state.method === "delivery") return (state.deliverable || !checkerOn) && dateValid("delivery") && addressValid();
    return false;
  }

  function summaryValid() {
    return senderValid() && methodValid();
  }

  // --- Render: shell ---------------------------------------------------------

  function renderShell() {
    Array.prototype.slice.call(block.children).forEach(function (child) {
      if (child.tagName !== "SCRIPT") block.removeChild(child);
    });

    var head = el("div", "q8-dc__head");
    head.appendChild(el("h2", "q8-dc__heading", settings.heading || "Checkout"));
    statusNode = el("span", "q8-dc__status");
    statusNode.hidden = true;
    head.appendChild(statusNode);
    block.appendChild(head);

    var layout = el("div", "q8-dc__layout");
    stepsNav = el("nav", "q8-dc__steps");
    stepsNav.setAttribute("aria-label", "Checkout steps");
    main = el("div", "q8-dc__main");
    orderCard = el("aside", "q8-dc__order");
    layout.appendChild(stepsNav);
    layout.appendChild(main);
    layout.appendChild(orderCard);
    block.appendChild(layout);
    block.hidden = false;
  }

  function renderSteps() {
    stepsNav.textContent = "";
    var defs = [
      [1, settings.steps.sender || "Sender information", "user"],
      [2, settings.steps.method || "Delivery / Pickup", state.method === "pickup" ? "store" : "truck"],
      [3, settings.steps.options || "Options", "gift"],
      [4, settings.steps.summary || "Review & Checkout", "card"],
    ];
    defs.filter(function (def) {
      return def[0] !== 3 || optionsOn();
    }).forEach(function (def) {
      var number = def[0];
      var completed = number < state.step || state.done[number];
      var current = number === state.step;
      var item = el("button", "q8-dc__step" + (current ? " q8-dc__step--current" : "") + (completed && !current ? " q8-dc__step--done" : ""));
      item.type = "button";
      item.disabled = !completed && !current;
      if (current) item.setAttribute("aria-current", "step");
      var bubble = el("span", "q8-dc__step-icon");
      bubble.appendChild(icon(completed && !current ? "check" : def[2]));
      item.appendChild(bubble);
      var text = el("span", "q8-dc__step-text");
      text.appendChild(el("span", "q8-dc__step-title", def[1]));
      var sub = current ? settings.steps.current : completed ? settings.steps.completed : "";
      if (sub) text.appendChild(el("span", "q8-dc__step-sub", sub));
      item.appendChild(text);
      item.addEventListener("click", function () {
        if (number < state.step || state.done[number]) go(number);
      });
      stepsNav.appendChild(item);
    });
  }

  function go(step) {
    if (step === 3 && !optionsOn()) {
      state.done[3] = true;
      step = 4;
    }
    state.step = step;
    setBlocked(!(step === 4 && summaryValid()));
    renderSteps();
    renderOrder();
    if (step === 1) renderSender();
    else if (step === 2) renderMethod();
    else if (step === 3) renderOptions();
    else renderSummary();
    main.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // --- Render: empty cart ------------------------------------------------------

  function renderEmpty() {
    Array.prototype.slice.call(block.children).forEach(function (child) {
      if (child.tagName !== "SCRIPT") block.removeChild(child);
    });
    var e = settings.empty;
    var panel = el("section", "q8-dc__panel q8-dc__empty");
    var bubble = el("span", "q8-dc__empty-icon");
    bubble.appendChild(icon("bag", 28));
    panel.appendChild(bubble);
    panel.appendChild(el("h2", "q8-dc__heading q8-dc__empty-title", e.title || "No products selected"));
    if (e.text) panel.appendChild(el("p", "q8-dc__intro", e.text));
    var link = document.createElement("a");
    link.className = "q8-dc__primary q8-dc__empty-cta";
    link.href = block.dataset.shopUrl || ROOT + "collections/all";
    link.textContent = e.cta || "Keep shopping";
    panel.appendChild(link);
    block.appendChild(panel);
    block.hidden = false;
    setBlocked(false);
  }

  // --- Render: step 1 --------------------------------------------------------

  function renderSender() {
    main.textContent = "";
    var s = settings.sender;
    var labels = s.labels || {};
    var panel = el("section", "q8-dc__panel");
    panel.appendChild(el("h3", "q8-dc__title", s.title || "Sender information"));
    if (s.intro) panel.appendChild(el("p", "q8-dc__intro", s.intro));

    var card = el("div", "q8-dc__card");
    card.appendChild(el("h4", "q8-dc__card-title", s.senderHeading || "Your details"));
    var grid = el("div", "q8-dc__grid");
    var sender = state.sender;
    function bind(obj, key) {
      return function (event) {
        obj[key] = event.target.value.trim();
        save(patchFor());
        refreshContinue();
      };
    }
    grid.appendChild(field({ id: "q8-dc-s-email", label: labels.email || "Email", type: "email", autocomplete: "email", value: sender.email, onChange: bind(sender, "email") }).wrap);
    grid.appendChild(field({ id: "q8-dc-s-first", label: labels.firstName || "First name", half: true, autocomplete: "given-name", value: sender.firstName, onChange: bind(sender, "firstName") }).wrap);
    grid.appendChild(field({ id: "q8-dc-s-last", label: labels.lastName || "Last name", half: true, autocomplete: "family-name", value: sender.lastName, onChange: bind(sender, "lastName") }).wrap);
    var senderPhone = field({ id: "q8-dc-s-phone", label: labels.phone || "Phone", type: "tel", autocomplete: "tel", value: sender.phone, optional: s.requirePhone === false, onChange: function (event) {
      bind(sender, "phone")(event);
      senderPhone.setError(sender.phone && !phoneOk(sender.phone) ? s.phoneError : "");
    } });
    grid.appendChild(senderPhone.wrap);
    card.appendChild(grid);
    panel.appendChild(card);

    var recipientCard = el("div", "q8-dc__card");
    var head = el("div", "q8-dc__card-head");
    head.appendChild(el("h4", "q8-dc__card-title", s.recipientHeading || "Recipient"));
    head.appendChild(
      toggle(s.selfLabel || "I'm sending this to myself", state.self, function (checked) {
        state.self = checked;
        rgrid.hidden = checked;
        save(patchFor());
        refreshContinue();
      }),
    );
    recipientCard.appendChild(head);
    var rgrid = el("div", "q8-dc__grid");
    rgrid.hidden = state.self;
    var r = state.recipient;
    rgrid.appendChild(field({ id: "q8-dc-r-first", label: labels.firstName || "First name", half: true, autocomplete: "off", value: r.firstName, onChange: bind(r, "firstName") }).wrap);
    rgrid.appendChild(field({ id: "q8-dc-r-last", label: labels.lastName || "Last name", half: true, autocomplete: "off", value: r.lastName, onChange: bind(r, "lastName") }).wrap);
    var recipientPhone = field({ id: "q8-dc-r-phone", label: labels.phone || "Phone", type: "tel", autocomplete: "off", value: r.phone, optional: s.requirePhone === false, onChange: function (event) {
      bind(r, "phone")(event);
      recipientPhone.setError(r.phone && !phoneOk(r.phone) ? s.phoneError : "");
    } });
    rgrid.appendChild(recipientPhone.wrap);
    recipientCard.appendChild(rgrid);
    panel.appendChild(recipientCard);

    var actions = el("div", "q8-dc__actions");
    var next = primaryButton(settings.continueLabel || "Continue", function () {
      if (!senderValid()) return;
      state.done[1] = true;
      flush();
      go(2);
    });
    actions.appendChild(next);
    panel.appendChild(actions);
    main.appendChild(panel);

    function refreshContinue() {
      next.disabled = !senderValid();
    }
    refreshContinue();
  }

  function patchFor() {
    var p = {};
    p[ATTR.senderEmail] = state.sender.email;
    p[ATTR.senderFirst] = state.sender.firstName;
    p[ATTR.senderLast] = state.sender.lastName;
    p[ATTR.senderPhone] = state.sender.phone;
    p[ATTR.self] = state.self ? "Yes" : "";
    p[ATTR.recipientFirst] = state.self ? "" : state.recipient.firstName;
    p[ATTR.recipientLast] = state.self ? "" : state.recipient.lastName;
    p[ATTR.recipientPhone] = state.self ? "" : state.recipient.phone;
    p[ATTR.method] = state.method === "pickup" ? "Pickup" : state.method === "delivery" ? "Delivery" : "";
    p[ATTR.date] = state.method === "delivery" ? state.dates.delivery : "";
    p[ATTR.pickupDate] = state.method === "pickup" ? state.dates.pickup : "";
    var tw = timedWindow();
    p[ATTR.timed] = tw ? timedLabel(tw) : "";
    p[ATTR.timedCode] = tw ? tw.code : "";
    var cfg = optionsConfig();
    var on = optionsOn();
    p[ATTR.cardMessage] = on && cfg.cardMessageEnabled !== false ? state.options.cardMessage : "";
    p[ATTR.notes] = on && cfg.notesEnabled !== false ? state.options.notes : "";
    p[ATTR.occasion] = on && cfg.occasionEnabled !== false ? state.options.occasion : "";
    p[ATTR.door] = on && cfg.doorEnabled !== false && state.method === "delivery" ? state.options.door : "";
    p[NOTE_KEY] = p[ATTR.notes];
    if (state.method === "delivery") {
      p[ATTR.locationType] = state.locationType;
      p[ATTR.zip] = state.zip;
      p[ATTR.zone] = (state.zone && state.zone.name) || "";
      p[ATTR.price] = state.zone && typeof state.zone.price === "number" ? formatMoney(state.zone.price, currency) : "";
      p[ATTR.address1] = state.address.address1;
      p[ATTR.address2] = state.address.address2;
      p[ATTR.city] = state.address.city;
      p[ATTR.province] = state.address.province;
      p[ATTR.country] = state.address.country;
    } else {
      [ATTR.locationType, ATTR.zip, ATTR.zone, ATTR.price, ATTR.address1, ATTR.address2, ATTR.city, ATTR.province, ATTR.country].forEach(function (key) {
        p[key] = "";
      });
    }
    return p;
  }

  // --- Render: step 2 --------------------------------------------------------

  function renderMethod() {
    main.textContent = "";
    var m = settings.method;
    var panel = el("section", "q8-dc__panel");

    var options = el("div", "q8-dc__options");
    function option(kind, name, hint, iconName) {
      var button = el("button", "q8-dc__option" + (state.method === kind ? " q8-dc__option--on" : ""));
      button.type = "button";
      button.setAttribute("aria-pressed", state.method === kind ? "true" : "false");
      var bubble = el("span", "q8-dc__option-icon");
      bubble.appendChild(icon(iconName));
      button.appendChild(bubble);
      var text = el("span", "q8-dc__option-text");
      text.appendChild(el("span", "q8-dc__option-title", name));
      if (hint) text.appendChild(el("span", "q8-dc__option-hint", hint));
      button.appendChild(text);
      button.addEventListener("click", function () {
        state.method = kind;
        save(patchFor());
        renderMethod();
        renderSteps();
        renderOrder();
        syncTimedProperty();
      });
      return button;
    }
    options.appendChild(option("delivery", m.deliveryLabel || "Delivery", m.deliveryHint, "truck"));
    if (m.pickupEnabled !== false) options.appendChild(option("pickup", m.pickupLabel || "Pickup", m.pickupHint, "store"));
    panel.appendChild(options);

    panel.appendChild(el("h3", "q8-dc__title", state.method === "pickup" ? m.pickupLabel || "Pickup" : m.title || "Delivery"));
    if (m.intro && state.method !== "pickup") panel.appendChild(el("p", "q8-dc__intro", m.intro));

    if (state.method) {
      var to = el("div", "q8-dc__delivering-to");
      to.appendChild(icon("pin"));
      to.appendChild(el("span", null, fill(m.deliveringTo || "Delivering to: {name} · {phone}", { name: recipientName(), phone: recipientPhone() })));
      panel.appendChild(to);
    }

    if (state.method === "pickup") {
      var note = el("div", "q8-dc__card q8-dc__pickup");
      note.appendChild(el("p", null, m.pickupNote || ""));
      panel.appendChild(note);
      if (rulesFor("pickup")) panel.appendChild(renderCalendar("pickup"));
    } else if (state.method === "delivery") {
      panel.appendChild(renderDelivery());
    }

    var actions = el("div", "q8-dc__actions");
    actions.appendChild(linkButton(settings.backLabel || "Back", function () {
      go(1);
    }));
    var next = primaryButton(settings.continueLabel || "Continue", function () {
      if (!methodValid()) return;
      state.done[2] = true;
      flush();
      go(stepAfterMethod());
    });
    next.disabled = !methodValid();
    actions.appendChild(next);
    panel.appendChild(actions);
    main.appendChild(panel);
    block.q8RefreshMethod = function () {
      next.disabled = !methodValid();
    };
  }

  function renderDelivery() {
    var m = settings.method;
    var labels = m.labels || {};
    var wrap = el("div", "q8-dc__delivery");

    // Zip check (only when the app's checker is on)
    if (checkerOn) {
      var zipCard = el("div", "q8-dc__card");
      if (!state.deliverable) {
        if (m.zipPrompt) zipCard.appendChild(el("p", "q8-dc__prompt", m.zipPrompt));
        var form = el("form", "q8-dc__zip-form");
        form.setAttribute("novalidate", "");
        var input = document.createElement("input");
        input.className = "q8-dc__input q8-dc__zip-input";
        input.type = "text";
        input.autocomplete = "postal-code";
        input.maxLength = 12;
        input.placeholder = m.zipPlaceholder || "ZIP code";
        input.value = state.zip;
        var button = el("button", "q8-dc__check", m.checkLabel || "Check");
        button.type = "submit";
        form.appendChild(input);
        form.appendChild(button);
        zipCard.appendChild(form);
        var note = el("p", "q8-dc__note q8-dc__note--no");
        note.hidden = true;
        zipCard.appendChild(note);
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          var zip = input.value.trim();
          if (!zip) return;
          button.disabled = true;
          button.textContent = m.checkingLabel || "Checking…";
          checkZip(zip)
            .then(function (result) {
              state.zip = (result && result.zip) || zip.toUpperCase();
              if (result && result.deliverable) {
                if (m.rememberZip !== false) storageSet(ZIP_KEY, state.zip);
                state.zone = result.zone || null;
                state.deliverable = true;
                save(patchFor());
                renderMethod();
                renderOrder();
              } else {
                state.deliverable = false;
                note.textContent = fill(m.failText || "Sorry, we don't deliver to {zip} yet.", { zip: state.zip });
                note.hidden = false;
                button.disabled = false;
                button.textContent = m.checkLabel || "Check";
              }
            })
            .catch(function () {
              button.disabled = false;
              button.textContent = m.checkLabel || "Check";
            });
        });
      } else {
        var result = el("div", "q8-dc__result");
        result.appendChild(el("span", "q8-dc__result-pill", fill(m.successText || "Great, we deliver to {zip}.", { zip: state.zip })));
        var zone = state.zone || {};
        if (zone.price === 0 && m.freeText) result.appendChild(el("span", "q8-dc__result-note", m.freeText));
        else if (typeof zone.price === "number" && zone.price > 0 && m.priceText) result.appendChild(el("span", "q8-dc__result-note", fill(m.priceText, { price: formatMoney(zone.price, currency) })));
        if (zone.message) result.appendChild(el("span", "q8-dc__result-note", zone.message));
        result.appendChild(linkButton(m.changeLabel || "Change", function () {
          state.deliverable = false;
          state.zone = null;
          storageSet(ZIP_KEY, null);
          renderMethod();
          renderOrder();
        }, "q8-dc__change"));
        zipCard.appendChild(result);
      }
      wrap.appendChild(zipCard);
      if (!state.deliverable) return wrap;
    }

    // Date
    if (rulesFor("delivery")) wrap.appendChild(renderCalendar("delivery"));

    // Timed delivery window (optional, surcharge)
    if (timeWindows().length) wrap.appendChild(renderTimed());

    // Address
    var heading = el("h4", "q8-dc__section-title");
    heading.appendChild(icon("pin"));
    heading.appendChild(el("span", null, m.addressHeading || "Delivery Address"));
    wrap.appendChild(heading);

    var types = (m.locationTypes || "").split(",").map(function (t) {
      return t.trim();
    }).filter(Boolean);
    if (m.locationTypeLabel && types.length) {
      wrap.appendChild(el("p", "q8-dc__label", m.locationTypeLabel));
      var chips = el("div", "q8-dc__chips");
      types.forEach(function (type) {
        var chip = el("button", "q8-dc__chip" + (state.locationType === type ? " q8-dc__chip--on" : ""), type);
        chip.type = "button";
        chip.setAttribute("aria-pressed", state.locationType === type ? "true" : "false");
        chip.addEventListener("click", function () {
          state.locationType = type;
          Array.prototype.forEach.call(chips.children, function (node) {
            var on = node === chip;
            node.classList.toggle("q8-dc__chip--on", on);
            node.setAttribute("aria-pressed", on ? "true" : "false");
          });
          save(patchFor());
        });
        chips.appendChild(chip);
      });
      wrap.appendChild(chips);
    }

    var card = el("div", "q8-dc__card");
    var grid = el("div", "q8-dc__grid");
    var a = state.address;
    function bind(key) {
      return function (event) {
        a[key] = event.target.value.trim();
        save(patchFor());
        if (block.q8RefreshMethod) block.q8RefreshMethod();
      };
    }
    grid.appendChild(field({ id: "q8-dc-a1", label: labels.address1 || "Street Address", autocomplete: "address-line1", value: a.address1, placeholder: "Start typing an address…", onChange: bind("address1") }).wrap);
    if (m.showAddress2 !== false) grid.appendChild(field({ id: "q8-dc-a2", label: labels.address2 || "Apt / Suite / Unit", autocomplete: "address-line2", value: a.address2, optional: true, onChange: bind("address2") }).wrap);
    grid.appendChild(field({ id: "q8-dc-city", label: labels.city || "City", half: true, autocomplete: "address-level2", value: a.city, onChange: bind("city") }).wrap);
    var provinceField = field({ id: "q8-dc-prov", label: labels.province || "State", half: true, autocomplete: "address-level1", value: a.province, options: provinceOptions(a.country), onChange: bind("province") });
    grid.appendChild(provinceField.wrap);
    var countryField = field({ id: "q8-dc-country", label: labels.country || "Country", half: true, autocomplete: "country", value: a.country, options: COUNTRIES, onChange: function (event) {
      a.country = event.target.value.toUpperCase();
      a.province = "";
      var replacement = field({ id: "q8-dc-prov", label: labels.province || "State", half: true, autocomplete: "address-level1", value: "", options: provinceOptions(a.country), onChange: bind("province") });
      provinceField.wrap.replaceWith(replacement.wrap);
      provinceField = replacement;
      save(patchFor());
      if (block.q8RefreshMethod) block.q8RefreshMethod();
    } });
    grid.appendChild(countryField.wrap);
    grid.appendChild(field({ id: "q8-dc-zip", label: labels.zip || "ZIP code", half: true, autocomplete: "postal-code", value: state.zip, readOnly: checkerOn, onChange: function (event) {
      state.zip = event.target.value.trim().toUpperCase();
      save(patchFor());
      if (block.q8RefreshMethod) block.q8RefreshMethod();
    } }).wrap);
    card.appendChild(grid);
    wrap.appendChild(card);
    return wrap;
  }

  function renderTimed() {
    var t = settings.timed;
    var card = el("div", "q8-dc__card q8-dc__timed");
    var head = el("h4", "q8-dc__section-title");
    head.appendChild(icon("clock"));
    head.appendChild(el("span", null, t.label || "Timed delivery"));
    card.appendChild(head);
    var options = [["", t.none || "No preference"]].concat(timeWindows().map(function (w) {
      return [w.code, timedLabel(w)];
    }));
    var picker = field({ id: "q8-dc-timed", label: t.pickLabel || "Deliver", options: options, value: timedWindow() ? state.timed : "", onChange: function (event) {
      state.timed = event.target.value;
      save(patchFor());
      renderOrder();
      syncTimedProperty();
      note.textContent = noteText();
    } });
    card.appendChild(picker.wrap);
    function noteText() {
      var w = timedWindow();
      if (w && w.price > 0) return fill(t.pickedNote || "{label} adds {price} to the delivery price.", { label: w.label, price: formatMoney(w.price, currency) });
      return t.note || "Timed delivery is subject to extra charges. The delivery price updates when you pick a window.";
    }
    var note = el("p", "q8-dc__note q8-dc__note--info", noteText());
    card.appendChild(note);
    return card;
  }

  // --- Render: step 3 --------------------------------------------------------

  function renderSummary() {
    main.textContent = "";
    var s = settings.summary;
    var panel = el("section", "q8-dc__panel");
    panel.appendChild(el("h3", "q8-dc__title", s.title || "Review & Checkout"));
    if (s.intro) panel.appendChild(el("p", "q8-dc__intro", s.intro));

    var card = el("div", "q8-dc__card q8-dc__review");
    function row(label, lines, step) {
      var r = el("div", "q8-dc__review-row");
      r.appendChild(el("span", "q8-dc__review-label", label));
      var body = el("div", "q8-dc__review-body");
      lines.filter(Boolean).forEach(function (line) {
        body.appendChild(el("span", null, line));
      });
      r.appendChild(body);
      r.appendChild(linkButton(settings.editLabel || "Edit", function () {
        go(step);
      }));
      card.appendChild(r);
    }
    var sd = state.sender;
    row(s.senderRow || "From", [sd.firstName + " " + sd.lastName, sd.email, sd.phone], 1);
    row(s.recipientRow || "To", [recipientName() + (state.self ? " (yourself)" : ""), recipientPhone()], 1);
    var c = settings.calendar;
    if (state.method === "pickup") {
      row(s.methodRow || "Delivery", [settings.method.pickupLabel || "Pickup", state.dates.pickup ? (c.pickupLabel || "Pickup date") + ": " + prettyDate(state.dates.pickup) : "", settings.method.pickupNote], 2);
    } else {
      var a = state.address;
      var zone = state.zone || {};
      var priceLine = zone.price === 0 ? settings.method.freeText : typeof zone.price === "number" ? fill(settings.method.priceText, { price: formatMoney(zone.price, currency) }) : "";
      var tw = timedWindow();
      row(s.methodRow || "Delivery", [
        state.dates.delivery ? (c.deliveryLabel || "Delivery date") + ": " + prettyDate(state.dates.delivery) : "",
        tw ? (settings.timed.label || "Timed delivery") + ": " + timedLabel(tw) : "",
        [state.locationType, a.address1, a.address2].filter(Boolean).join(" \u00b7 "),
        [a.city, a.province, state.zip].filter(Boolean).join(", ") + (a.country ? " " + a.country : ""),
        priceLine,
      ], 2);
    }
    if (optionsOn()) {
      var op = state.options;
      var o2 = settings.options;
      var cfg = optionsConfig();
      var lines = [
        cfg.occasionEnabled !== false && op.occasion ? (o2.occasionLabel || "Occasion") + ": " + op.occasion : "",
        cfg.cardMessageEnabled !== false && op.cardMessage ? (o2.cardLabel || "Card message") + ": " + op.cardMessage : "",
        cfg.notesEnabled !== false && op.notes ? (cfg.notesLabel || o2.notesLabel || "Notes") + ": " + op.notes : "",
        cfg.doorEnabled !== false && state.method === "delivery" && op.door ? (o2.doorLabel || "If nobody answers the door") + ": " + op.door : "",
      ];
      row(o2.summaryRow || "Extras", lines.some(Boolean) ? lines : [o2.summaryNone || "None added"], 3);
    }
    panel.appendChild(card);

    var actions = el("div", "q8-dc__actions q8-dc__actions--column");
    var checkout = el("button", "q8-dc__checkout", s.checkoutLabel || "Continue to checkout");
    checkout.type = "button";
    checkout.disabled = !summaryValid();
    checkout.addEventListener("click", goToCheckout);
    actions.appendChild(checkout);
    if (s.checkoutHint) actions.appendChild(el("p", "q8-dc__hint", s.checkoutHint));
    actions.appendChild(linkButton(settings.backLabel || "Back", function () {
      go(optionsOn() ? 3 : 2);
    }));
    panel.appendChild(actions);
    main.appendChild(panel);
    setBlocked(!summaryValid());
  }

  // --- Render: calendar --------------------------------------------------------

  function renderCalendar(method) {
    var rules = rulesFor(method);
    var c = settings.calendar;
    var card = el("div", "q8-dc__card q8-dc__cal");
    var head = el("h4", "q8-dc__section-title");
    head.appendChild(icon("calendar"));
    head.appendChild(el("span", null, method === "pickup" ? c.pickupLabel || "Pickup date" : c.deliveryLabel || "Delivery date"));
    card.appendChild(head);
    if (c.hint) card.appendChild(el("p", "q8-dc__intro", c.hint));

    var clock = tick();
    var chosen = state.dates[method];
    if (chosen && !dateAllowed(rules, chosen, today, now)) chosen = state.dates[method] = "";
    var first = firstAllowed(rules, today, now);
    var methodWord = method === "pickup" ? c.pickupWord || "pickup" : c.deliveryWord || "delivery";
    var status = todayStatus(rules, now);
    if ((rules.leadDays || 0) === 0 && status !== "open") {
      card.appendChild(el("p", "q8-dc__note q8-dc__note--today", status === "closed"
        ? fill(c.todayOverText || "Today {method} is over (orders close at {time}).", { method: methodWord, time: formatTime12(rules.todayCutoff) })
        : fill(c.todayOffText || "Same-day {method} isn't available.", { method: methodWord })));
    }
    if (!first) {
      card.appendChild(el("p", "q8-dc__note q8-dc__note--no", c.none || "No dates are available right now."));
      if (clock.timezone) card.appendChild(el("p", "q8-dc__tz", fill(c.timezoneText || "Shop time: {time} ({timezone})", { time: formatTime12(clock.time), timezone: clock.timezone })));
      return card;
    }
    var anchor = isoParts(chosen || first);
    var view = { y: anchor[0], m: anchor[1] };
    var grid = el("div", "q8-dc__cal-grid");
    var title = el("span", "q8-dc__cal-title");
    var nav = el("div", "q8-dc__cal-nav");
    var prev = el("button", "q8-dc__cal-btn", "\u2039");
    prev.type = "button"; prev.setAttribute("aria-label", "Previous month");
    var next = el("button", "q8-dc__cal-btn", "\u203a");
    next.type = "button"; next.setAttribute("aria-label", "Next month");
    nav.appendChild(prev); nav.appendChild(title); nav.appendChild(next);
    card.appendChild(nav);
    card.appendChild(grid);
    var picked = el("p", "q8-dc__cal-picked");
    card.appendChild(picked);
    if (clock.timezone) card.appendChild(el("p", "q8-dc__tz", fill(c.timezoneText || "Shop time: {time} ({timezone})", { time: formatTime12(clock.time), timezone: clock.timezone })));

    function monthLabel(y, m) {
      try {
        return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(document.documentElement.lang || "en", { month: "long", year: "numeric", timeZone: "UTC" });
      } catch (e) {
        return y + "-" + m;
      }
    }
    function draw() {
      grid.textContent = "";
      title.textContent = monthLabel(view.y, view.m);
      ["S", "M", "T", "W", "T", "F", "S"].forEach(function (d) {
        grid.appendChild(el("span", "q8-dc__cal-dow", d));
      });
      var firstDay = new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay();
      var days = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
      for (var i = 0; i < firstDay; i += 1) grid.appendChild(el("span", "q8-dc__cal-pad"));
      for (var d = 1; d <= days; d += 1) {
        var iso = view.y + "-" + String(view.m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
        var ok = dateAllowed(rules, iso, today, now);
        var cell = el("button", "q8-dc__cal-day" + (iso === state.dates[method] ? " q8-dc__cal-day--on" : "") + (iso === today ? " q8-dc__cal-day--today" : ""), String(d));
        cell.type = "button";
        cell.disabled = !ok;
        cell.setAttribute("aria-label", prettyDate(iso) + (ok ? "" : " (unavailable)"));
        if (iso === state.dates[method]) cell.setAttribute("aria-pressed", "true");
        (function (value) {
          cell.addEventListener("click", function () {
            state.dates[method] = value;
            save(patchFor());
            draw();
            if (block.q8RefreshMethod) block.q8RefreshMethod();
          });
        })(iso);
        grid.appendChild(cell);
      }
      var sel = state.dates[method];
      picked.textContent = sel ? (c.pickedText || "Selected: {date}").replace("{date}", prettyDate(sel)) : (schedule.requireDate === false ? c.optionalText || "" : c.requiredText || "Pick a day to continue.");
      var minIso = isoAddDays(today, rules.leadDays || 0);
      var maxIso = isoAddDays(today, rules.maxDaysAhead == null ? 60 : rules.maxDaysAhead);
      var minP = isoParts(minIso), maxP = isoParts(maxIso);
      prev.disabled = view.y * 12 + view.m <= minP[0] * 12 + minP[1];
      next.disabled = view.y * 12 + view.m >= maxP[0] * 12 + maxP[1];
    }
    prev.addEventListener("click", function () {
      view.m -= 1; if (view.m < 1) { view.m = 12; view.y -= 1; }
      draw();
    });
    next.addEventListener("click", function () {
      view.m += 1; if (view.m > 12) { view.m = 1; view.y += 1; }
      draw();
    });
    draw();
    return card;
  }

  // --- Render: step 3 (options) ------------------------------------------------

  function renderOptions() {
    main.textContent = "";
    var o = settings.options;
    var op = state.options;
    var panel = el("section", "q8-dc__panel");
    panel.appendChild(el("h3", "q8-dc__title", o.title || "Options"));
    if (o.intro) panel.appendChild(el("p", "q8-dc__intro", o.intro));

    var card = el("div", "q8-dc__card");
    var grid = el("div", "q8-dc__grid");
    function bind(key) {
      return function (event) {
        op[key] = event.target.value.replace(/\s+$/, "").slice(0, 1000);
        save(patchFor());
      };
    }
    var cfg = optionsConfig();
    var occasionField = null;
    // Products linked to the chosen occasion (Occasions feature), one-tap add.
    var occasionRecs = el("div", "q8-dc__recs q8-dc__recs--occasion");
    occasionRecs.hidden = true;
    var slugByName = {};
    function showOccasionProducts() {
      var slug = slugByName[op.occasion];
      if (!slug) {
        occasionRecs.hidden = true;
        return;
      }
      fetchOccasionProducts(slug)
        .then(function (data) {
          if (slugByName[op.occasion] !== slug) return; // changed meanwhile
          renderRecs(occasionRecs, { products: (data && data.products) || [], heading: fill(o.occasionProductsHeading || "Perfect for {occasion}", { occasion: op.occasion }) });
        })
        .catch(function () { occasionRecs.hidden = true; });
    }
    if (cfg.occasionEnabled !== false) {
      occasionField = field({ id: "q8-dc-occasion", label: o.occasionLabel || "Occasion", options: [["", o.occasionPlaceholder || "Choose an occasion"]].concat(op.occasion ? [[op.occasion, op.occasion]] : []), value: op.occasion, onChange: function (event) {
        op.occasion = event.target.value;
        save(patchFor());
        showOccasionProducts();
      } });
      occasionField.wrap.hidden = true;
      grid.appendChild(occasionField.wrap);
    }
    if (cfg.cardMessageEnabled !== false) grid.appendChild(field({ id: "q8-dc-card", label: o.cardLabel || "Card message", optional: true, textarea: true, rows: 3, maxLength: 500, placeholder: o.cardPlaceholder, value: op.cardMessage, onChange: bind("cardMessage") }).wrap);
    if (cfg.notesEnabled !== false) grid.appendChild(field({ id: "q8-dc-notes", label: cfg.notesLabel || o.notesLabel || "Notes for us", optional: true, textarea: true, rows: 3, maxLength: 1000, placeholder: o.notesPlaceholder, value: op.notes, onChange: bind("notes") }).wrap);
    if (cfg.doorEnabled !== false && state.method === "delivery") {
      grid.appendChild(field({ id: "q8-dc-door", label: o.doorLabel || "If nobody answers the door", options: [["", o.doorPlaceholder || "Choose an option"], [o.doorYes || "Yes, it's okay to leave them", o.doorYes || "Yes, it's okay to leave them"], [o.doorNo || "No, do not leave them", o.doorNo || "No, do not leave them"]], value: op.door, onChange: function (event) {
        op.door = event.target.value;
        save(patchFor());
      } }).wrap);
    }
    if (!grid.children.length) card.appendChild(el("p", "q8-dc__note q8-dc__note--info", o.nothingText || "Nothing to add here — continue when you're ready."));
    card.appendChild(grid);
    panel.appendChild(card);
    panel.appendChild(occasionRecs);

    // Occasions come from the merchant's Occasions feature; hidden when there are none.
    if (occasionField) fetchOccasions()
      .then(function (occasions) {
        if (!occasions.length) return;
        var select = occasionField.control;
        select.textContent = "";
        occasions.forEach(function (occ) { slugByName[occ.name] = occ.slug; });
        [["", o.occasionPlaceholder || "Choose an occasion"]].concat(occasions.map(function (occ) {
          return [occ.name, (occ.icon ? occ.icon + " " : "") + occ.name];
        })).forEach(function (pair) {
          var option = document.createElement("option");
          option.value = pair[0];
          option.textContent = pair[1];
          if (pair[0] === op.occasion) option.selected = true;
          select.appendChild(option);
        });
        occasionField.wrap.hidden = false;
        showOccasionProducts();
      })
      .catch(function () { /* no occasions, no field */ });

    // Smart Recommendations upsell
    var recs = el("div", "q8-dc__recs");
    recs.hidden = true;
    panel.appendChild(recs);
    fetchRecommendations(cartData || { items: [] })
      .then(function (data) {
        renderRecs(recs, data);
      })
      .catch(function () { /* rail stays hidden */ });

    var actions = el("div", "q8-dc__actions");
    actions.appendChild(linkButton(settings.backLabel || "Back", function () {
      go(2);
    }));
    actions.appendChild(primaryButton(settings.continueLabel || "Continue", function () {
      state.done[3] = true;
      flush();
      go(4);
    }));
    panel.appendChild(actions);
    main.appendChild(panel);
  }

  function renderRecs(container, data) {
    var o = settings.options;
    var products = (data && data.products) || [];
    container.textContent = "";
    if (!products.length) {
      container.hidden = true;
      return;
    }
    var inCart = {};
    ((cartData && cartData.items) || []).forEach(function (item) { inCart[String(item.product_id)] = true; });
    var head = el("div", "q8-dc__recs-head");
    head.appendChild(el("h4", "q8-dc__section-title", (data && data.heading) || o.recsHeading || "Complete your order"));
    if (o.recsIntro) head.appendChild(el("p", "q8-dc__intro", o.recsIntro));
    container.appendChild(head);
    var track = el("div", "q8-dc__recs-track");
    var errorLine = el("p", "q8-dc__error");
    errorLine.hidden = true;
    products.forEach(function (product) {
      var cardNode = el("article", "q8-dc__rec");
      var media = el("div", "q8-dc__rec-media");
      if (product.imageUrl) {
        var img = document.createElement("img");
        img.src = product.imageUrl;
        img.alt = product.title || "";
        img.loading = "lazy";
        media.appendChild(img);
      }
      cardNode.appendChild(media);
      var body = el("div", "q8-dc__rec-body");
      body.appendChild(el("span", "q8-dc__rec-title", product.title || ""));
      if (typeof product.price === "number") body.appendChild(el("span", "q8-dc__rec-price", formatMoney(product.price, currency)));
      var pid = String(product.productId || product.id || "").split("/").pop();
      var button = el("button", "q8-dc__rec-add", inCart[pid] ? o.addedLabel || "Added" : o.addLabel || "Add");
      button.type = "button";
      if (inCart[pid] || !product.variantId) button.disabled = true;
      button.addEventListener("click", function () {
        button.disabled = true;
        button.textContent = o.addingLabel || "Adding\u2026";
        errorLine.hidden = true;
        addVariant(product.variantId)
          .then(reloadCart)
          .then(function () {
            button.textContent = o.addedLabel || "Added";
            renderOrder();
            try {
              document.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true, detail: cartData }));
            } catch (e) { /* nothing to announce to */ }
          })
          .catch(function (error) {
            button.disabled = false;
            button.textContent = o.addLabel || "Add";
            errorLine.textContent = (error && error.message) || "Could not add to cart.";
            errorLine.hidden = false;
          });
      });
      body.appendChild(button);
      cardNode.appendChild(body);
      track.appendChild(cardNode);
    });
    container.appendChild(track);
    container.appendChild(errorLine);
    container.hidden = false;
  }

  function goToCheckout() {
    if (!summaryValid()) return;
    clearTimeout(saveTimer);
    flush();
    var who = state.self ? state.sender : state.recipient;
    var params = new URLSearchParams();
    if (state.sender.email) params.set("checkout[email]", state.sender.email);
    params.set("checkout[shipping_address][first_name]", who.firstName);
    params.set("checkout[shipping_address][last_name]", who.lastName);
    if (state.method === "delivery") {
      var a = state.address;
      params.set("checkout[shipping_address][address1]", a.address1);
      if (a.address2) params.set("checkout[shipping_address][address2]", a.address2);
      params.set("checkout[shipping_address][city]", a.city);
      if (a.province) params.set("checkout[shipping_address][province]", a.province);
      params.set("checkout[shipping_address][country]", a.country);
      params.set("checkout[shipping_address][zip]", state.zip);
    }
    window.location.href = ROOT + "checkout?" + params.toString();
  }

  // --- Render: order summary card ----------------------------------------------
  // Works on Shopify's cart JSON (the same shape /cart/change.js returns),
  // so quantity changes and removals re-render from the live response.

  var cartData = null;

  function thumb(url) {
    if (!url) return null;
    if (!/^https?:/i.test(url) && url.indexOf("//") !== 0) return url;
    try {
      var u = new URL(url, window.location.href);
      u.searchParams.set("width", "200"); // Shopify CDN resizes on request
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function changeLine(key, quantity) {
    return fetch(ROOT + "cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id: key, quantity: quantity }),
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function renderOrder() {
    orderCard.textContent = "";
    if (!cartData) cartData = readJson("[data-q8-dc-cart]") || { items: [], item_count: 0 };
    var cart = cartData;
    var o = settings.order;
    var cents = function (value) {
      return (Number(value) || 0) / 100;
    };

    var head = el("div", "q8-dc__order-head");
    head.appendChild(el("h3", "q8-dc__order-title", o.title || "Order summary"));
    head.appendChild(el("span", "q8-dc__order-count", fill(o.itemsLabel, { count: cart.item_count })));
    orderCard.appendChild(head);

    var list = el("div", "q8-dc__order-items");
    (cart.items || []).forEach(function (item) {
      var row = el("div", "q8-dc__order-item");
      var media = el("div", "q8-dc__order-thumb");
      var src = thumb(item.image);
      if (src) {
        var img = document.createElement("img");
        img.src = src;
        img.alt = item.product_title || "";
        img.loading = "lazy";
        media.appendChild(img);
      }
      row.appendChild(media);

      var text = el("div", "q8-dc__order-text");
      text.appendChild(el("span", "q8-dc__order-name", item.product_title || item.title || ""));
      if (item.variant_title && item.variant_title !== "Default Title") {
        text.appendChild(el("span", "q8-dc__order-variant", item.variant_title));
      }
      (item.line_level_discount_allocations || []).forEach(function (allocation) {
        var title = allocation.discount_application && allocation.discount_application.title;
        if (title) text.appendChild(el("span", "q8-dc__order-discount", title + " · −" + formatMoney(cents(allocation.amount), currency)));
      });

      var controls = el("div", "q8-dc__qty");
      var minus = el("button", "q8-dc__qty-btn", "−");
      minus.type = "button";
      minus.setAttribute("aria-label", "Decrease quantity");
      var count = el("span", "q8-dc__qty-value", String(item.quantity));
      var plus = el("button", "q8-dc__qty-btn", "+");
      plus.type = "button";
      plus.setAttribute("aria-label", "Increase quantity");
      controls.appendChild(minus);
      controls.appendChild(count);
      controls.appendChild(plus);
      var remove = el("button", "q8-dc__order-remove", o.removeLabel || "Remove");
      remove.type = "button";
      var actions = el("div", "q8-dc__order-actions");
      actions.appendChild(controls);
      actions.appendChild(remove);
      text.appendChild(actions);
      row.appendChild(text);

      var price = el("div", "q8-dc__order-price");
      if (item.original_line_price > item.final_line_price) {
        price.appendChild(el("s", "q8-dc__order-was", formatMoney(cents(item.original_line_price), currency)));
      }
      price.appendChild(el("span", null, formatMoney(cents(item.final_line_price), currency)));
      row.appendChild(price);
      list.appendChild(row);

      function update(quantity) {
        row.classList.add("q8-dc__order-item--busy");
        changeLine(item.key, quantity)
          .then(function (next) {
            cartData = next;
            if (!next.item_count) {
              window.location.reload();
              return;
            }
            renderOrder();
            syncTimedProperty();
            try {
              document.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true, detail: next }));
            } catch (e) {
              /* nothing to announce to */
            }
          })
          .catch(function () {
            row.classList.remove("q8-dc__order-item--busy");
          });
      }
      minus.addEventListener("click", function () {
        update(Math.max(0, item.quantity - 1));
      });
      plus.addEventListener("click", function () {
        update(item.quantity + 1);
      });
      remove.addEventListener("click", function () {
        update(0);
      });
    });
    orderCard.appendChild(list);

    var deliveryKnown = state.method === "pickup" || (state.method === "delivery" && state.zone && typeof state.zone.price === "number");
    var deliveryAmount = state.method === "pickup" ? 0 : deliveryKnown ? state.zone.price : null;
    var tw = timedWindow();
    var timedAmount = tw ? tw.price : 0;

    var totals = el("div", "q8-dc__order-totals");
    function line(label, value, className) {
      var r = el("div", "q8-dc__order-line" + (className ? " " + className : ""));
      r.appendChild(el("span", null, label));
      r.appendChild(el("span", null, value));
      return r;
    }
    totals.appendChild(line(o.subtotalLabel || "Subtotal", formatMoney(cents(cart.original_total_price), currency)));
    if (cart.total_discount > 0) {
      var names = (cart.cart_level_discount_applications || [])
        .map(function (application) {
          return application.title;
        })
        .filter(Boolean);
      var label = o.discountsLabel || "Discounts";
      if (names.length) label += " (" + names.join(", ") + ")";
      totals.appendChild(line(label, "−" + formatMoney(cents(cart.total_discount), currency), "q8-dc__order-line--discount"));
    }
    totals.appendChild(
      line(
        o.deliveryLabel || "Delivery",
        deliveryAmount === null
          ? o.deliveryPending || "Calculated at checkout"
          : deliveryAmount === 0
            ? settings.method.freeText || formatMoney(0, currency)
            : formatMoney(deliveryAmount, currency),
      ),
    );
    if (tw) totals.appendChild(line((settings.timed.label || "Timed delivery") + " (" + tw.label + ")", "+" + formatMoney(timedAmount, currency)));
    orderCard.appendChild(totals);
    orderCard.appendChild(line(o.totalLabel || "Total", formatMoney(cents(cart.total_price) + (deliveryAmount || 0) + timedAmount, currency), "q8-dc__order-line--total"));
  }

  // --- Boot ------------------------------------------------------------------

  settings = readJson("[data-q8-dc-settings]") || {};
  settings.sender = settings.sender || {};
  settings.method = settings.method || {};
  settings.summary = settings.summary || {};
  settings.order = settings.order || {};
  settings.steps = settings.steps || {};
  // Copy that is no longer a theme setting (Shopify caps blocks at 75 settings)
  settings.steps.completed = settings.steps.completed || "Completed";
  settings.steps.current = settings.steps.current || "In progress";
  settings.editLabel = settings.editLabel || "Edit";
  settings.method.checkingLabel = settings.method.checkingLabel || "Checking…";
  settings.order.itemsLabel = "{count} items";
  settings.method.labels = settings.method.labels || {};
  settings.method.labels.zip = settings.method.labels.zip || settings.method.zipPlaceholder || "ZIP code";
  settings.sender.phoneError = settings.sender.phoneError || "Enter a valid phone number (7 to 15 digits).";
  settings.steps.options = settings.steps.options || "Options";
  settings.options = settings.options || {
    title: "Options",
    intro: "Add a card message, notes for us, or something extra for the order.",
    occasionLabel: "Occasion",
    occasionPlaceholder: "Choose an occasion",
    cardLabel: "Card message",
    cardPlaceholder: "The message we should write on the card",
    notesLabel: "Notes for us",
    notesPlaceholder: "Delivery instructions, allergies, anything we should know",
    recsHeading: "Complete your order",
    recsIntro: "",
    addLabel: "Add",
    addingLabel: "Adding\u2026",
    addedLabel: "Added",
    summaryRow: "Extras",
    summaryNone: "None added",
    doorLabel: "If nobody answers the door",
    doorPlaceholder: "Choose an option",
    doorYes: "Yes, it's okay to leave them",
    doorNo: "No, do not leave them",
    occasionProductsHeading: "Perfect for {occasion}",
    nothingText: "Nothing to add here \u2014 continue when you're ready.",
  };
  settings.calendar = settings.calendar || {
    deliveryLabel: "Delivery date",
    pickupLabel: "Pickup date",
    hint: "",
    none: "No dates are available right now. Please contact us.",
    pickedText: "Selected: {date}",
    requiredText: "Pick a day to continue.",
    optionalText: "",
    todayOverText: "Today {method} is over (orders close at {time}).",
    todayOffText: "Same-day {method} isn't available.",
    deliveryWord: "delivery",
    pickupWord: "pickup",
    timezoneText: "Shop time: {time} ({timezone})",
  };
  settings.timed = settings.timed || {
    label: "Timed delivery",
    pickLabel: "Deliver",
    none: "No preference",
    note: "Timed delivery is subject to extra charges. The delivery price updates when you pick a window.",
    pickedNote: "{label} adds {price} to the delivery price.",
  };
  settings.empty = settings.empty || {
    title: "No products selected",
    text: "Add something to your cart, then come back here to arrange delivery or pickup.",
    cta: "Keep shopping",
  };
  currency = block.dataset.currency;
  defaultCountry = (block.dataset.country || "US").toUpperCase();
  state = initialState(readJson("[data-q8-dc-attributes]") || {});

  installGate();
  cartData = readJson("[data-q8-dc-cart]") || { items: [], item_count: 0 };
  if (!cartData.item_count) {
    renderEmpty();
    return;
  }
  setBlocked(true);
  renderShell();

  // Is the zip checker on? Re-verify a remembered zip. Load the calendar rules. Then start at step 1.
  Promise.all([
    checkZip(state.zip || "00000-probe")
      .then(function (result) {
        checkerOn = Boolean(result && result.enabled);
        if (checkerOn && state.zip && result.deliverable) {
          state.zone = result.zone || null;
          state.deliverable = true;
        }
      })
      .catch(function () {
        checkerOn = false;
      }),
    fetchSchedule()
      .then(function (result) {
        // Windows and the clock are useful even with the calendar off.
        schedule = result || null;
        tick();
        if (state.timed && !timeWindows().some(function (w) { return w.code === state.timed; })) state.timed = "";
      })
      .catch(function () {
        schedule = null;
      }),
  ]).then(function () {
    go(1);
    syncTimedProperty();
  });
})();
