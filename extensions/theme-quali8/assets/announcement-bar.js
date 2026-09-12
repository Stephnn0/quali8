/*
 * Quali8 — Announcement & delivery bar (app embed).
 *
 * Asks the app proxy for today's announcement and whether the zip code
 * delivery checker is on, then renders the bar above the header (moved to
 * the top of <body>, or fixed at the bottom) with the theme-editor
 * presentation settings: prefix, link, countdown, close button, marquee,
 * and the checker itself. The checker posts the shopper's code to the
 * proxy and shows the zone's answer and price; the code can be remembered
 * in localStorage. DOM built with createElement/textContent only.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var DISMISS_KEY = "q8-bar-dismissed";
  var ZIP_KEY = "q8-bar-zip";

  var blocks = document.querySelectorAll("[data-quali8-announcement]");
  if (!blocks.length) return;

  function readSettings(block) {
    var node = block.querySelector("[data-q8-bar-settings]");
    try {
      return JSON.parse((node && node.textContent) || "{}") || {};
    } catch (e) {
      return {};
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

  /** "2d 04h 12m" until the end of the end date (local midnight). */
  function countdownText(endDate) {
    var end = new Date(endDate + "T23:59:59");
    var diff = end.getTime() - Date.now();
    if (isNaN(diff) || diff <= 0) return null;
    var minutes = Math.floor(diff / 60000);
    var days = Math.floor(minutes / 1440);
    var hours = Math.floor((minutes % 1440) / 60);
    var mins = minutes % 60;
    var parts = [];
    if (days) parts.push(days + "d");
    parts.push((hours < 10 ? "0" : "") + hours + "h");
    parts.push((mins < 10 ? "0" : "") + mins + "m");
    return parts.join(" ");
  }

  // --- Announcement message ----------------------------------------------------

  function messageNode(settings, bar) {
    var wrap = el("span", "q8-bar__message");
    if (settings.prefix) wrap.appendChild(el("span", "q8-bar__prefix", settings.prefix));
    wrap.appendChild(el("span", "q8-bar__text", bar.message));

    if (settings.showCountdown && bar.endDate) {
      var text = countdownText(bar.endDate);
      if (text) {
        var countdown = el("span", "q8-bar__countdown");
        if (settings.countdownLabel) {
          countdown.appendChild(el("span", "q8-bar__countdown-label", settings.countdownLabel));
        }
        var value = el("span", "q8-bar__countdown-value", text);
        countdown.appendChild(value);
        wrap.appendChild(countdown);
        setInterval(function () {
          value.textContent = countdownText(bar.endDate) || "0h 00m";
        }, 30000);
      }
    }

    if (settings.linkUrl && settings.linkLabel) {
      var link = document.createElement("a");
      link.className =
        "q8-bar__link" + (settings.linkStyle === "button" ? " q8-bar__link--button" : "");
      link.href = settings.linkUrl;
      link.textContent = settings.linkLabel;
      wrap.appendChild(link);
    }
    return wrap;
  }

  // --- Zip code delivery check -------------------------------------------------

  function checkZip(zip) {
    return fetch(ROOT + "apps/quali8/delivery-check?zip=" + encodeURIComponent(zip), {
      headers: { Accept: "application/json" },
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function checkerNode(block, settings) {
    var wrap = el("span", "q8-bar__check");
    var currency = block.dataset.currency;

    function showForm(initialZip) {
      wrap.textContent = "";
      if (settings.deliveryPrompt) {
        wrap.appendChild(el("span", "q8-bar__check-prompt", settings.deliveryPrompt));
      }
      var form = el("form", "q8-bar__check-form");
      form.setAttribute("novalidate", "");
      var input = document.createElement("input");
      input.className = "q8-bar__check-input";
      input.type = "text";
      input.inputMode = "text";
      input.autocomplete = "postal-code";
      input.maxLength = 12;
      input.placeholder = settings.zipPlaceholder || "ZIP code";
      input.setAttribute("aria-label", settings.zipPlaceholder || "ZIP code");
      if (initialZip) input.value = initialZip;
      var button = el("button", "q8-bar__check-button", settings.checkLabel || "Check");
      button.type = "submit";
      form.appendChild(input);
      form.appendChild(button);
      wrap.appendChild(form);

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var zip = input.value.trim();
        if (!zip) {
          input.focus();
          return;
        }
        button.disabled = true;
        button.textContent = settings.checkingLabel || "…";
        checkZip(zip)
          .then(function (result) {
            if (settings.rememberZip !== false) storageSet(ZIP_KEY, zip);
            showResult(zip, result);
          })
          .catch(function () {
            button.disabled = false;
            button.textContent = settings.checkLabel || "Check";
          });
      });
    }

    function showResult(zip, result) {
      wrap.textContent = "";
      var yes = Boolean(result && result.deliverable);
      var pill = el("span", "q8-bar__check-result" + (yes ? "" : " q8-bar__check-result--no"));
      pill.setAttribute("role", "status");
      var values = { zip: (result && result.zip) || zip };
      if (yes) {
        pill.appendChild(el("span", null, fill(settings.successText || "Yes, we deliver to {zip}!", values)));
        var zone = result.zone || {};
        if (zone.price === 0 && settings.freeText) {
          pill.appendChild(el("span", "q8-bar__check-note", settings.freeText));
        } else if (typeof zone.price === "number" && zone.price > 0 && settings.priceText) {
          pill.appendChild(
            el("span", "q8-bar__check-note", fill(settings.priceText, { price: formatMoney(zone.price, currency) })),
          );
        }
        if (zone.message) pill.appendChild(el("span", "q8-bar__check-note", zone.message));
      } else {
        pill.appendChild(el("span", null, fill(settings.failText || "Sorry, we don't deliver to {zip} yet.", values)));
      }
      wrap.appendChild(pill);

      var change = el("button", "q8-bar__check-change", settings.changeLabel || "Change");
      change.type = "button";
      change.addEventListener("click", function () {
        storageSet(ZIP_KEY, null);
        showForm(zip);
      });
      wrap.appendChild(change);
    }

    var remembered = settings.rememberZip !== false ? storageGet(ZIP_KEY) : null;
    if (remembered) {
      showForm(remembered);
      checkZip(remembered)
        .then(function (result) {
          showResult(remembered, result);
        })
        .catch(function () {
          /* leave the form */
        });
    } else {
      showForm("");
    }
    return wrap;
  }

  // --- Render --------------------------------------------------------------------

  function place(block, settings) {
    var position = settings.position || "top";
    if (position === "bottom") return; // fixed via CSS, stays where Liquid put it
    if (document.body.firstChild !== block) {
      document.body.insertBefore(block, document.body.firstChild);
    }
  }

  function render(block, settings, bar, deliveryOn) {
    Array.prototype.slice.call(block.children).forEach(function (child) {
      if (!child.hasAttribute("data-q8-bar-settings")) block.removeChild(child);
    });

    var useApp = settings.useAppColors !== false && bar;
    block.style.setProperty(
      "--q8-bar-bg",
      (useApp ? bar.backgroundColor : settings.backgroundColor) || settings.backgroundColor || "#2c1f58",
    );
    block.style.setProperty(
      "--q8-bar-text",
      (useApp ? bar.textColor : settings.textColor) || settings.textColor || "#ffffff",
    );

    var inner = el("div", "q8-bar__inner");
    var marquee = settings.marquee && bar && !deliveryOn;

    if (bar) {
      if (marquee) {
        var track = el("div", "q8-bar__track");
        track.appendChild(messageNode(settings, bar));
        var copy = messageNode(settings, bar);
        copy.setAttribute("aria-hidden", "true");
        track.appendChild(copy);
        inner.appendChild(track);
      } else {
        inner.appendChild(messageNode(settings, bar));
      }
    }
    if (!marquee) block.classList.remove("q8-bar--marquee");

    if (deliveryOn) inner.appendChild(checkerNode(block, settings));

    if (settings.dismissible !== false) {
      var close = el("button", "q8-bar__close");
      close.type = "button";
      close.setAttribute("aria-label", "Close announcement");
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("aria-hidden", "true");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M 4 4 L 12 12 M 12 4 L 4 12");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("fill", "none");
      svg.appendChild(path);
      close.appendChild(svg);
      close.addEventListener("click", function () {
        storageSet(DISMISS_KEY, String(Date.now() + Math.max(1, settings.dismissDays || 1) * 86400000));
        block.classList.add("q8-bar--closing");
        setTimeout(function () {
          block.hidden = true;
        }, 220);
      });
      inner.appendChild(close);
    }

    block.appendChild(inner);
    block.classList.add("q8-bar--anim-" + (settings.animation || "slide"));
    place(block, settings);
    block.hidden = false;
  }

  if (Number(storageGet(DISMISS_KEY) || 0) > Date.now()) return;

  fetch(ROOT + "apps/quali8/announcement", { headers: { Accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      var bar = data && data.bar && data.bar.message ? data.bar : null;
      var deliveryOn = Boolean(data && data.deliveryCheck && data.deliveryCheck.enabled);
      blocks.forEach(function (block) {
        var settings = readSettings(block);
        var showChecker = deliveryOn && settings.showDeliveryCheck !== false;
        if (!bar && !showChecker) return;
        render(block, settings, bar, showChecker);
      });
    })
    .catch(function () {
      /* never break the storefront */
    });
})();
