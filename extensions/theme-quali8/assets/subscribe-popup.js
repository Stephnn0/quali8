/*
 * Quali8 — Subscribe popup.
 *
 * Shows the live popup from the app proxy once per visitor (localStorage,
 * for the configured number of days; subscribers never again) on the
 * configured trigger: delay, scroll depth, exit intent, or delay + exit.
 * Subscribing posts to the storefront's native /contact newsletter
 * endpoint (no app scopes involved), reveals the merchant's discount code,
 * and can apply it to the cart. All DOM built with createElement and
 * textContent.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var DONE_KEY = "q8-popup-done";
  var SUBSCRIBED_KEY = "q8-popup-subscribed";

  var mount = document.querySelector("[data-quali8-popup]");
  if (!mount) return;

  function readSettings() {
    var node = mount.querySelector("[data-q8-popup-settings]");
    try {
      return JSON.parse((node && node.textContent) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  var settings = readSettings();

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      /* private browsing — the popup may repeat, acceptable */
    }
  }

  if (storageGet(SUBSCRIBED_KEY)) return;
  var doneUntil = Number(storageGet(DONE_KEY) || 0);
  if (doneUntil > Date.now()) return;

  var isMobile = window.matchMedia && window.matchMedia("(max-width: 749px)").matches;
  if (isMobile && settings.showOnMobile === false) return;

  function markDone() {
    var days = Math.max(1, Number(settings.showAgainDays) || 30);
    storageSet(DONE_KEY, String(Date.now() + days * 86400000));
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function subscribe(email, firstName) {
    var body = new FormData();
    body.append("form_type", "customer");
    body.append("utf8", "✓");
    body.append("contact[email]", email);
    if (firstName) body.append("contact[first_name]", firstName);
    body.append("contact[tags]", settings.customerTags || "newsletter,quali8-popup");
    return fetch(ROOT + "contact", { method: "POST", body: body }).then(
      function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
      },
    );
  }

  /** Shopify applies a code to the session via /discount/<code>. */
  function applyDiscount(code) {
    return fetch(ROOT + "discount/" + encodeURIComponent(code), {
      credentials: "same-origin",
    }).catch(function () {
      /* best effort — the shopper still has the code */
    });
  }

  function closeButton() {
    var close = el("button", "q8-popup__close");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
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
    return close;
  }

  function show(popup) {
    var layout = settings.layout || "split";
    var overlay = el("div", "q8-popup__overlay");
    // The overlay is appended to <body>, outside the mount: carry the
    // mount's CSS variables and `q8-popup--*` modifiers over to it.
    overlay.setAttribute("style", mount.getAttribute("style") || "");
    Array.prototype.forEach.call(mount.classList, function (name) {
      if (name.indexOf("q8-popup--") === 0) {
        overlay.classList.add("q8-popup__overlay--" + name.slice(10));
      }
    });

    var modal = el("div", "q8-popup__modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", layout === "toast" ? "false" : "true");
    modal.setAttribute("aria-label", popup.heading);

    if (layout !== "text" && layout !== "toast" && popup.imageUrl) {
      var media = el("div", "q8-popup__media");
      media.style.backgroundImage =
        'url("' + String(popup.imageUrl).replace(/"/g, "%22") + '")';
      modal.appendChild(media);
    }

    var content = el("div", "q8-popup__content");
    var close = null;
    if (settings.showClose !== false) {
      close = closeButton();
      content.appendChild(close);
    }
    content.appendChild(el("h2", "q8-popup__heading", popup.heading));
    content.appendChild(el("p", "q8-popup__description", popup.description));

    var form = el("form", "q8-popup__form");
    form.setAttribute("novalidate", "");

    var nameInput = null;
    if (settings.showNameField) {
      nameInput = document.createElement("input");
      nameInput.className = "q8-popup__input";
      nameInput.type = "text";
      nameInput.placeholder = settings.namePlaceholder || "First name";
      nameInput.autocomplete = "given-name";
      nameInput.setAttribute("aria-label", settings.namePlaceholder || "First name");
      form.appendChild(nameInput);
    }

    var input = document.createElement("input");
    input.className = "q8-popup__input";
    input.type = "email";
    input.placeholder = settings.emailPlaceholder || "Email address";
    input.autocomplete = "email";
    input.setAttribute("aria-label", settings.emailPlaceholder || "Email address");
    form.appendChild(input);

    var error = el("p", "q8-popup__error", settings.invalidEmailText || "Please enter a valid email address.");
    error.hidden = true;
    form.appendChild(error);

    var button = el("button", "q8-popup__button", settings.buttonLabel || "Subscribe");
    button.type = "submit";
    form.appendChild(button);
    content.appendChild(form);

    if (settings.noteText) {
      content.appendChild(el("p", "q8-popup__note", settings.noteText));
    }
    if (settings.declineLabel) {
      var decline = el("button", "q8-popup__decline", settings.declineLabel);
      decline.type = "button";
      decline.addEventListener("click", dismiss);
      content.appendChild(decline);
    }

    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (layout !== "toast") document.documentElement.classList.add("q8-popup-open");
    setTimeout(function () {
      (nameInput || input).focus({ preventScroll: true });
    }, 50);

    function dismiss() {
      markDone();
      overlay.classList.add("q8-popup__overlay--out");
      document.documentElement.classList.remove("q8-popup-open");
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 200);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(event) {
      if (event.key === "Escape") dismiss();
    }
    if (close) close.addEventListener("click", dismiss);
    if (settings.closeOnOverlay !== false && layout !== "toast") {
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) dismiss();
      });
    }
    document.addEventListener("keydown", onKey);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = input.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        input.classList.add("q8-popup__input--error");
        error.hidden = false;
        input.focus();
        return;
      }
      input.classList.remove("q8-popup__input--error");
      error.hidden = true;
      button.disabled = true;
      button.textContent = settings.submittingLabel || "Subscribing…";

      subscribe(email, nameInput ? nameInput.value.trim() : "")
        .catch(function () {
          /* subscription is best-effort; the code is the reward either way */
        })
        .then(function () {
          storageSet(SUBSCRIBED_KEY, String(Date.now()));
          markDone();
          content.textContent = "";
          if (close) content.appendChild(close);
          content.appendChild(el("h2", "q8-popup__heading", settings.successHeading || "You're in!"));
          content.appendChild(el("p", "q8-popup__description", settings.successText || "Use this code at checkout:"));
          content.appendChild(el("div", "q8-popup__code", popup.discountCode));

          var copy = el("button", "q8-popup__button", settings.copyLabel || "Copy code");
          copy.type = "button";
          copy.addEventListener("click", function () {
            try {
              navigator.clipboard.writeText(popup.discountCode);
              copy.textContent = settings.copiedLabel || "Copied ✓";
            } catch (e) {
              /* the code is visible to copy by hand */
            }
          });
          content.appendChild(copy);

          if (settings.applyDiscount !== false) {
            var applied = el("p", "q8-popup__note q8-popup__note--applied", settings.appliedText || "Applied at checkout.");
            applied.hidden = true;
            content.appendChild(applied);
            applyDiscount(popup.discountCode).then(function () {
              applied.hidden = false;
            });
          }
        });
    });
  }

  // --- Triggers ----------------------------------------------------------------

  function arm(popup) {
    var fired = false;
    function fire() {
      if (fired) return;
      fired = true;
      show(popup);
    }

    var trigger = settings.trigger || "delay";
    var delay = Math.max(0, Number(settings.delaySeconds) || 0) * 1000;

    if (trigger === "delay" || trigger === "delay_exit") {
      setTimeout(fire, delay);
    }
    if (trigger === "scroll") {
      var target = Math.max(5, Number(settings.scrollPercent) || 40) / 100;
      var onScroll = function () {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        if (max <= 0 || (window.scrollY || doc.scrollTop) / max >= target) {
          window.removeEventListener("scroll", onScroll);
          fire();
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    if (trigger === "exit" || trigger === "delay_exit") {
      if (isMobile && trigger === "exit") {
        // No exit intent on touch — fall back to the delay
        setTimeout(fire, Math.max(delay, 8000));
      } else {
        document.addEventListener("mouseout", function onOut(event) {
          if (!event.relatedTarget && event.clientY <= 0) {
            document.removeEventListener("mouseout", onOut);
            fire();
          }
        });
      }
    }
  }

  fetch(ROOT + "apps/quali8/popup", { headers: { Accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      var popup = data && data.popup;
      if (!popup || !popup.heading || !popup.discountCode) return;
      arm(popup);
    })
    .catch(function () {
      /* never break the storefront */
    });
})();
