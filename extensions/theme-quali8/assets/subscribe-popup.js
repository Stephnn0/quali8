/*
 * Quali8 — Subscribe popup.
 *
 * Shows the live popup from the app proxy once per visitor (localStorage,
 * for the configured number of days; subscribers never again) on the
 * configured trigger: delay, scroll depth, exit intent, or delay + exit.
 * Subscribing posts to the app proxy (/apps/quali8/subscribe), which saves
 * the shopper as a Shopify customer with marketing consent and records the
 * signup for the Subscribe Boost analytics; the storefront's native
 * /contact form is the fallback when the app can't write customers. The
 * popup then reveals the merchant's discount code and can apply it to the
 * cart. Views and closes are reported to the same proxy.
 *
 * In the theme editor (Shopify.designMode) the popup opens at once with
 * the scheduled image and copy (or a sample), ignores the trigger and the
 * once-per-visitor memory, doesn't submit or count, and re-renders when
 * the block's settings change. All DOM built with createElement and
 * textContent.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var DONE_KEY = "q8-popup-done";
  var SUBSCRIBED_KEY = "q8-popup-subscribed";
  var DESIGN_MODE = Boolean(window.Shopify && window.Shopify.designMode);

  var mount = document.querySelector("[data-quali8-popup]");
  if (!mount) return;
  if (mount.hasAttribute("data-q8-popup-booted")) return;
  mount.setAttribute("data-q8-popup-booted", "");

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

  if (!DESIGN_MODE) {
    if (storageGet(SUBSCRIBED_KEY)) return;
    var doneUntil = Number(storageGet(DONE_KEY) || 0);
    if (doneUntil > Date.now()) return;
  }

  var isMobile = window.matchMedia && window.matchMedia("(max-width: 749px)").matches;
  if (isMobile && settings.showOnMobile === false && !DESIGN_MODE) return;

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

  /** Fire-and-forget analytics ping (view / dismiss) to the app proxy. */
  function track(event) {
    if (DESIGN_MODE) return;
    try {
      fetch(ROOT + "apps/quali8/subscribe", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ event: event }),
      }).catch(function () {});
    } catch (e) {
      /* analytics are best-effort */
    }
  }

  /** The theme's native newsletter form — used only when the app can't save customers. */
  function subscribeViaContactForm(email, firstName) {
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

  /**
   * Saves the subscriber through the app, which creates the Shopify
   * customer and records the signup. Falls back to the theme form when the
   * app reports it lacks the customers permission or is unreachable.
   */
  function subscribe(email, firstName) {
    if (DESIGN_MODE) return Promise.resolve();
    return fetch(ROOT + "apps/quali8/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        event: "subscribe",
        email: email,
        firstName: firstName || "",
        tags: settings.customerTags || "newsletter,quali8-popup",
      }),
    })
      .then(function (response) {
        return response.json().catch(function () {
          return { ok: false, savedInShopify: false };
        });
      })
      .then(function (result) {
        if (result && result.savedInShopify) return;
        // The shop's plan cap is used up: the app declined on purpose, so
        // the theme form must not collect the signup either.
        if (result && result.limitReached) return;
        return subscribeViaContactForm(email, firstName);
      })
      .catch(function () {
        return subscribeViaContactForm(email, firstName);
      });
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

  var currentOverlay = null;

  function removeOverlay() {
    if (currentOverlay && currentOverlay.parentNode) {
      currentOverlay.parentNode.removeChild(currentOverlay);
    }
    currentOverlay = null;
    document.documentElement.classList.remove("q8-popup-open");
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

    if (layout !== "text" && layout !== "toast") {
      var media = el("div", "q8-popup__media");
      if (popup.imageUrl) {
        // A real <img> (not only a background) so theme resets that hide
        // empty divs, like Dawn's `div:empty`, leave the image box alone.
        var picture = document.createElement("img");
        picture.src = String(popup.imageUrl);
        picture.alt = "";
        picture.decoding = "async";
        media.appendChild(picture);
        media.style.backgroundImage =
          'url("' + String(popup.imageUrl).replace(/"/g, "%22") + '")';
      } else {
        media.classList.add("q8-popup__media--placeholder");
      }
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
    currentOverlay = overlay;
    if (layout !== "toast") document.documentElement.classList.add("q8-popup-open");
    if (!DESIGN_MODE) {
      setTimeout(function () {
        (nameInput || input).focus({ preventScroll: true });
      }, 50);
    }
    track("view");

    function dismiss() {
      if (!DESIGN_MODE) markDone();
      track("dismiss");
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
          if (!DESIGN_MODE) {
            storageSet(SUBSCRIBED_KEY, String(Date.now()));
            markDone();
          }
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
            if (DESIGN_MODE) {
              applied.hidden = false;
            } else {
              applyDiscount(popup.discountCode).then(function () {
                applied.hidden = false;
              });
            }
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

  // --- Theme editor ------------------------------------------------------------

  var SAMPLE_POPUP = {
    imageUrl: "",
    heading: "Join the list",
    description:
      "This is a preview. Schedule your popup in Quali8 → Subscribe Boost to set the image, headline, and discount code.",
    discountCode: "WELCOME10",
    preview: true,
  };

  /** In the editor: open now, and re-open with fresh settings when the block changes. */
  function preview(popup) {
    function render() {
      var node = document.querySelector("[data-quali8-popup]");
      if (node) {
        mount = node;
        settings = readSettings();
      }
      removeOverlay();
      show(popup);
    }
    function holdsPopup(node) {
      if (!node || !node.querySelector) return false;
      return (
        (node.hasAttribute && node.hasAttribute("data-quali8-popup")) ||
        Boolean(node.querySelector("[data-quali8-popup]"))
      );
    }
    render();
    document.addEventListener("shopify:section:load", function (event) {
      if (holdsPopup(event.target)) render();
    });
    document.addEventListener("shopify:block:select", function (event) {
      if (holdsPopup(event.target)) render();
    });
    document.addEventListener("shopify:block:deselect", function (event) {
      if (holdsPopup(event.target)) removeOverlay();
    });
  }

  fetch(ROOT + "apps/quali8/popup" + (DESIGN_MODE ? "?preview=1" : ""), {
    headers: { Accept: "application/json" },
  })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      var popup = data && data.popup;
      if (DESIGN_MODE) {
        preview(popup && popup.heading ? popup : SAMPLE_POPUP);
        return;
      }
      if (!popup || !popup.heading || !popup.discountCode) return;
      arm(popup);
    })
    .catch(function () {
      if (DESIGN_MODE) preview(SAMPLE_POPUP);
      /* never break the storefront */
    });
})();
