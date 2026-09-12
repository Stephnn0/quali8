/*
 * Quali8 — Delivery checkout (cart page).
 *
 * Step 1: the shopper enters a zip code, checked against the merchant's
 * delivery zones through the app proxy. Step 2 (deliverable): a shipping
 * address form whose values save to cart attributes as they type. Step 3:
 * a Checkout button that opens Shopify checkout with the address prefilled
 * through the documented `checkout[...]` URL parameters. While delivery is
 * not confirmed, the theme's own checkout and express-payment buttons are
 * hidden (they cannot be prefilled and would bypass the gate).
 * All DOM built with createElement/textContent.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var ZIP_KEY = "q8-bar-zip"; // shared with the announcement bar's checker
  var SAVE_DELAY = 600;
  var BLOCKED_CLASS = "q8-dc-blocked";

  var block = document.querySelector("[data-quali8-delivery-checkout]");
  if (!block) return;

  var ATTR = {
    zip: "Delivery zip",
    zone: "Delivery zone",
    price: "Delivery price",
    firstName: "Delivery first name",
    lastName: "Delivery last name",
    address1: "Delivery address",
    address2: "Delivery address 2",
    city: "Delivery city",
    province: "Delivery province",
    country: "Delivery country",
    phone: "Delivery phone",
    email: "Delivery email",
  };

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

  // --- Data ------------------------------------------------------------------

  function checkZip(zip) {
    return fetch(ROOT + "apps/quali8/delivery-check?zip=" + encodeURIComponent(zip), {
      headers: { Accept: "application/json" },
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  var saveTimer = null;
  var inflight = false;
  var queued = false;
  var pendingAttributes = {};

  function saveAttributes(patch, statusNode, settings) {
    Object.keys(patch).forEach(function (key) {
      pendingAttributes[key] = patch[key];
    });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      flushAttributes(statusNode, settings);
    }, SAVE_DELAY);
  }

  function flushAttributes(statusNode, settings) {
    if (inflight) {
      queued = true;
      return;
    }
    var payload = { attributes: pendingAttributes };
    pendingAttributes = {};
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
          flushAttributes(statusNode, settings);
        }
      });
  }

  // --- Theme checkout gate ---------------------------------------------------

  function installGate(settings) {
    if (settings.hideThemeCheckout === false) return;
    var selector = settings.checkoutSelector || "";
    if (!selector.trim()) return;
    var style = document.createElement("style");
    style.setAttribute("data-q8-dc-gate", "");
    var rules = selector
      .split(",")
      .map(function (part) {
        return "html." + BLOCKED_CLASS + " " + part.trim();
      })
      .join(",\n");
    style.textContent = rules + " { display: none !important; }";
    document.head.appendChild(style);
  }

  function setBlocked(blocked) {
    document.documentElement.classList.toggle(BLOCKED_CLASS, blocked);
  }

  // --- Form pieces -------------------------------------------------------------

  function field(id, label, value, opts) {
    opts = opts || {};
    var wrap = el("div", "q8-dc__field" + (opts.half ? " q8-dc__field--half" : ""));
    var labelEl = el("label", "q8-dc__label", label + (opts.required ? "" : ""));
    labelEl.htmlFor = id;
    wrap.appendChild(labelEl);
    var control;
    if (opts.options) {
      control = document.createElement("select");
      opts.options.forEach(function (option) {
        var node = document.createElement("option");
        node.value = option[0];
        node.textContent = option[1];
        if (option[0] === value) node.selected = true;
        control.appendChild(node);
      });
    } else {
      control = document.createElement("input");
      control.type = opts.type || "text";
      control.value = value || "";
      if (opts.placeholder) control.placeholder = opts.placeholder;
    }
    control.id = id;
    control.className = "q8-dc__input";
    if (opts.autocomplete) control.setAttribute("autocomplete", opts.autocomplete);
    if (opts.required) control.required = true;
    if (opts.readOnly) control.readOnly = true;
    wrap.appendChild(control);
    return { wrap: wrap, control: control };
  }

  function provinceOptions(country) {
    var map = country === "US" ? US_STATES : country === "CA" ? CA_PROVINCES : null;
    if (!map) return null;
    return Object.keys(map).map(function (code) {
      return [code, map[code]];
    });
  }

  // --- Render ------------------------------------------------------------------

  function init() {
    var settings = readJson("[data-q8-dc-settings]") || {};
    var attributes = readJson("[data-q8-dc-attributes]") || {};
    var currency = block.dataset.currency;
    var customerEmail = block.dataset.customerEmail || "";
    var defaultCountry = (block.dataset.country || "US").toUpperCase();

    installGate(settings);
    setBlocked(true);

    var header = el("div", "q8-dc__header");
    var titles = el("div", "q8-dc__titles");
    if (settings.heading) titles.appendChild(el("h2", "q8-dc__heading", settings.heading));
    if (settings.subheading) titles.appendChild(el("p", "q8-dc__subheading", settings.subheading));
    header.appendChild(titles);
    var status = el("span", "q8-dc__status");
    status.hidden = true;
    header.appendChild(status);
    block.appendChild(header);

    var body = el("div", "q8-dc__body");
    block.appendChild(body);
    block.hidden = false;

    var state = {
      zip: attributes[ATTR.zip] || (settings.rememberZip !== false ? storageGet(ZIP_KEY) : "") || "",
      zone: null,
      deliverable: false,
    };

    function renderZipStep(message, tone) {
      body.textContent = "";
      setBlocked(true);
      var step = el("div", "q8-dc__step");
      if (settings.zipPrompt) step.appendChild(el("p", "q8-dc__prompt", settings.zipPrompt));
      var form = el("form", "q8-dc__zip-form");
      form.setAttribute("novalidate", "");
      var input = document.createElement("input");
      input.className = "q8-dc__input q8-dc__zip-input";
      input.type = "text";
      input.autocomplete = "postal-code";
      input.maxLength = 12;
      input.placeholder = settings.zipPlaceholder || "ZIP code";
      input.setAttribute("aria-label", settings.zipPlaceholder || "ZIP code");
      input.value = state.zip;
      var button = el("button", "q8-dc__check", settings.checkLabel || "Check availability");
      button.type = "submit";
      form.appendChild(input);
      form.appendChild(button);
      step.appendChild(form);
      var note = el("p", "q8-dc__note" + (tone === "no" ? " q8-dc__note--no" : ""), message || "");
      note.hidden = !message;
      note.setAttribute("role", "status");
      step.appendChild(note);
      body.appendChild(step);

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var zip = input.value.trim();
        if (!zip) {
          input.focus();
          return;
        }
        button.disabled = true;
        button.textContent = settings.checkingLabel || "Checking…";
        checkZip(zip)
          .then(function (result) {
            state.zip = (result && result.zip) || zip.toUpperCase();
            if (result && result.deliverable) {
              if (settings.rememberZip !== false) storageSet(ZIP_KEY, state.zip);
              state.zone = result.zone || null;
              state.deliverable = true;
              saveAttributes(
                {
                  [ATTR.zip]: state.zip,
                  [ATTR.zone]: (state.zone && state.zone.name) || "",
                  [ATTR.price]:
                    state.zone && typeof state.zone.price === "number"
                      ? formatMoney(state.zone.price, currency)
                      : "",
                },
                status,
                settings,
              );
              renderAddressStep();
            } else {
              state.deliverable = false;
              renderZipStep(fill(settings.failText || "Sorry, we don't deliver to {zip} yet.", { zip: state.zip }), "no");
            }
          })
          .catch(function () {
            button.disabled = false;
            button.textContent = settings.checkLabel || "Check availability";
          });
      });
      setTimeout(function () {
        input.focus({ preventScroll: true });
      }, 30);
    }

    function renderAddressStep() {
      body.textContent = "";
      var step = el("div", "q8-dc__step");

      // Zone result
      var result = el("div", "q8-dc__result");
      var pill = el("span", "q8-dc__result-pill", fill(settings.successText || "Great, we deliver to {zip}.", { zip: state.zip }));
      result.appendChild(pill);
      var zone = state.zone || {};
      if (zone.price === 0 && settings.freeText) {
        result.appendChild(el("span", "q8-dc__result-note", settings.freeText));
      } else if (typeof zone.price === "number" && zone.price > 0 && settings.priceText) {
        result.appendChild(el("span", "q8-dc__result-note", fill(settings.priceText, { price: formatMoney(zone.price, currency) })));
      }
      if (zone.message) result.appendChild(el("span", "q8-dc__result-note", zone.message));
      var change = el("button", "q8-dc__change", settings.changeLabel || "Change");
      change.type = "button";
      change.addEventListener("click", function () {
        state.deliverable = false;
        storageSet(ZIP_KEY, null);
        renderZipStep("");
      });
      result.appendChild(change);
      step.appendChild(result);

      if (settings.addressHeading) step.appendChild(el("h3", "q8-dc__form-heading", settings.addressHeading));

      var labels = settings.labels || {};
      var form = el("form", "q8-dc__form");
      form.setAttribute("novalidate", "");
      var grid = el("div", "q8-dc__grid");
      form.appendChild(grid);

      var country = (attributes[ATTR.country] || defaultCountry || "US").toUpperCase();
      var fields = {};

      function add(key, label, opts) {
        var f = field("q8-dc-" + key, label, attributes[ATTR[key]] || opts.value || "", opts);
        grid.appendChild(f.wrap);
        fields[key] = f.control;
        f.control.addEventListener("input", onChange);
        f.control.addEventListener("change", onChange);
        return f.control;
      }

      var showEmail = settings.showEmail !== false && !customerEmail;
      if (showEmail) add("email", labels.email || "Email", { type: "email", autocomplete: "email", required: true });
      add("firstName", labels.firstName || "First name", { half: true, autocomplete: "given-name", required: true });
      add("lastName", labels.lastName || "Last name", { half: true, autocomplete: "family-name", required: true });
      add("address1", labels.address1 || "Address", { autocomplete: "address-line1", required: true });
      if (settings.showAddress2 !== false) add("address2", labels.address2 || "Apartment, suite, etc.", { autocomplete: "address-line2" });
      add("city", labels.city || "City", { half: true, autocomplete: "address-level2", required: true });

      var provinceOpts = provinceOptions(country);
      var provinceControl = add("province", labels.province || "State", {
        half: true,
        autocomplete: "address-level1",
        required: Boolean(provinceOpts),
        options: provinceOpts ? [["", "—"]].concat(provinceOpts) : null,
      });
      add("country", labels.country || "Country", {
        half: true,
        autocomplete: "country",
        required: true,
        options: COUNTRIES,
        value: country,
      });
      var zipField = add("zip", settings.zipPlaceholder || "ZIP code", { half: true, autocomplete: "postal-code", value: state.zip, readOnly: true });
      zipField.value = state.zip;
      if (settings.showPhone !== false) add("phone", labels.phone || "Phone", { type: "tel", autocomplete: "tel", required: settings.requirePhone === true });

      // Rebuild the province control when the country changes
      fields.country.addEventListener("change", function () {
        var next = fields.country.value.toUpperCase();
        var opts = provinceOptions(next);
        var replacement = field("q8-dc-province", labels.province || "State", "", {
          half: true,
          autocomplete: "address-level1",
          required: Boolean(opts),
          options: opts ? [["", "—"]].concat(opts) : null,
        });
        provinceControl.parentNode.replaceWith(replacement.wrap);
        provinceControl = replacement.control;
        fields.province = provinceControl;
        provinceControl.addEventListener("input", onChange);
        provinceControl.addEventListener("change", onChange);
        onChange();
      });

      var actions = el("div", "q8-dc__actions");
      var checkout = el("button", "q8-dc__checkout", settings.checkoutLabel || "Continue to checkout");
      checkout.type = "submit";
      checkout.disabled = true;
      actions.appendChild(checkout);
      if (settings.checkoutHint) actions.appendChild(el("p", "q8-dc__hint", settings.checkoutHint));
      form.appendChild(actions);
      step.appendChild(form);
      body.appendChild(step);

      function values() {
        var out = {};
        Object.keys(fields).forEach(function (key) {
          out[key] = (fields[key].value || "").trim();
        });
        out.zip = state.zip;
        return out;
      }

      function valid(v) {
        if (showEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email || "")) return false;
        if (!v.firstName || !v.lastName || !v.address1 || !v.city || !v.country) return false;
        if (provinceOptions(v.country) && !v.province) return false;
        if (settings.requirePhone === true && !v.phone) return false;
        return true;
      }

      function onChange() {
        var v = values();
        var ok = valid(v);
        checkout.disabled = !ok;
        setBlocked(!ok);
        var patch = {};
        Object.keys(ATTR).forEach(function (key) {
          if (key === "zone" || key === "price") return;
          if (v[key] !== undefined) patch[ATTR[key]] = v[key];
        });
        saveAttributes(patch, status, settings);
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var v = values();
        if (!valid(v)) return;
        clearTimeout(saveTimer);
        flushAttributes(status, settings);
        var params = new URLSearchParams();
        var email = showEmail ? v.email : customerEmail;
        if (email) params.set("checkout[email]", email);
        params.set("checkout[shipping_address][first_name]", v.firstName);
        params.set("checkout[shipping_address][last_name]", v.lastName);
        params.set("checkout[shipping_address][address1]", v.address1);
        if (v.address2) params.set("checkout[shipping_address][address2]", v.address2);
        params.set("checkout[shipping_address][city]", v.city);
        if (v.province) params.set("checkout[shipping_address][province]", v.province);
        params.set("checkout[shipping_address][country]", v.country);
        params.set("checkout[shipping_address][zip]", v.zip);
        window.location.href = ROOT + "checkout?" + params.toString();
      });

      onChange();
      setTimeout(function () {
        (fields.email || fields.firstName).focus({ preventScroll: true });
      }, 30);
    }

    // Start: verify the zip checker is on; re-check a remembered zip.
    if (state.zip) {
      checkZip(state.zip)
        .then(function (result) {
          if (!result || !result.enabled) {
            block.hidden = true;
            setBlocked(false);
            return;
          }
          if (result.deliverable) {
            state.zone = result.zone || null;
            state.deliverable = true;
            renderAddressStep();
          } else {
            renderZipStep(fill(settings.failText || "", { zip: state.zip }), "no");
          }
        })
        .catch(function () {
          renderZipStep("");
        });
    } else {
      // A probe with an impossible code just tells us whether the checker is on
      checkZip("00000-probe")
        .then(function (result) {
          if (!result || !result.enabled) {
            block.hidden = true;
            setBlocked(false);
            return;
          }
          renderZipStep("");
        })
        .catch(function () {
          block.hidden = true;
          setBlocked(false);
        });
    }
  }

  init();
})();
