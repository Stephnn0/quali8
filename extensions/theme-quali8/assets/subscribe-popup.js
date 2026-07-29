/*
 * Quali8 — Subscribe popup for first-time visitors.
 *
 * Shows once per browser (localStorage) while a popup is scheduled for
 * today. Subscribing posts to the storefront's native /contact newsletter
 * endpoint (no app scopes involved) and reveals the merchant's discount
 * code. All DOM built with createElement/textContent.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var DONE_KEY = "q8-popup-done";

  var mount = document.querySelector("[data-quali8-popup]");
  if (!mount) return;

  try {
    if (localStorage.getItem(DONE_KEY)) return;
  } catch (e) {
    /* private browsing — popup may repeat, acceptable */
  }

  function markDone() {
    try {
      localStorage.setItem(DONE_KEY, String(Date.now()));
    } catch (e) {
      /* ignore */
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function subscribe(email) {
    var body = new FormData();
    body.append("form_type", "customer");
    body.append("utf8", "✓");
    body.append("contact[email]", email);
    body.append("contact[tags]", "newsletter,quali8-popup");
    return fetch(ROOT + "contact", { method: "POST", body: body }).then(
      function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
      },
    );
  }

  function show(popup) {
    var overlay = el("div", "q8-popup__overlay");
    var modal = el("div", "q8-popup__modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", popup.heading);

    var media = el("div", "q8-popup__media");
    media.style.backgroundImage = "url(" + encodeURI(popup.imageUrl) + ")";
    modal.appendChild(media);

    var content = el("div", "q8-popup__content");
    var close = el("button", "q8-popup__close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    content.appendChild(close);
    content.appendChild(el("h2", "q8-popup__heading", popup.heading));
    content.appendChild(el("p", "q8-popup__description", popup.description));

    var input = document.createElement("input");
    input.className = "q8-popup__input";
    input.type = "email";
    input.placeholder = "Email address";
    input.autocomplete = "email";
    content.appendChild(input);

    var button = el("button", "q8-popup__button", "Subscribe");
    button.type = "button";
    content.appendChild(button);

    var note = el("p", "q8-popup__note", "No spam, unsubscribe anytime.");
    content.appendChild(note);

    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function dismiss() {
      markDone();
      overlay.remove();
    }
    close.addEventListener("click", dismiss);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) dismiss();
    });
    document.addEventListener("keydown", function onKey(event) {
      if (event.key === "Escape") {
        dismiss();
        document.removeEventListener("keydown", onKey);
      }
    });

    button.addEventListener("click", function () {
      var email = input.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        input.classList.add("q8-popup__input--error");
        return;
      }
      input.classList.remove("q8-popup__input--error");
      button.disabled = true;
      button.textContent = "Subscribing…";

      subscribe(email)
        .catch(function () {
          /* subscription is best-effort; the code is the reward either way */
        })
        .then(function () {
          markDone();
          content.textContent = "";
          content.appendChild(close);
          content.appendChild(el("h2", "q8-popup__heading", "You're in!"));
          content.appendChild(
            el(
              "p",
              "q8-popup__description",
              "Use this code at checkout:",
            ),
          );
          var code = el("div", "q8-popup__code", popup.discountCode);
          content.appendChild(code);
          var copy = el("button", "q8-popup__button", "Copy code");
          copy.type = "button";
          copy.addEventListener("click", function () {
            try {
              navigator.clipboard.writeText(popup.discountCode);
              copy.textContent = "Copied ✓";
            } catch (e) {
              /* selection fallback unnecessary — code is visible */
            }
          });
          content.appendChild(copy);
          close.addEventListener("click", dismiss);
        });
    });
  }

  fetch(ROOT + "apps/quali8/popup", { headers: { Accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      var popup = data && data.popup;
      if (!popup || !popup.heading || !popup.discountCode) return;
      var delay = Number(mount.dataset.delay || 4) * 1000;
      setTimeout(function () {
        show(popup);
      }, delay);
    })
    .catch(function () {
      /* never break the storefront */
    });
})();
