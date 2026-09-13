/*
 * Quali8 — Occasions + Gifts (product pages).
 *
 * Stage 1 asks "Shopping for an occasion?" and offers a few occasion chips
 * (in-season first) plus an "Other occasions" chip that opens a picker with
 * every active occasion. Stage 2 swaps the block in place for a sideways
 * rail of that occasion's gift picks; one button adds the product being
 * viewed together with the gift (the upsell). Copy, counts, and behaviour
 * come from the app (Occasions page) through /apps/quali8/occasions; the
 * theme editor only supplies colours and shapes.
 *
 * Icons are optional: an occasion without one is shown as text. The chosen
 * occasion is remembered (when the merchant allows) so it sticks across
 * product pages and pre-fills the cart's Options step.
 *
 * All DOM is built with createElement/textContent — never innerHTML with
 * remote data. Add-to-cart posts JSON to the Ajax Cart API; when a variant
 * is rejected and the handle is known, it re-resolves an available variant
 * from the storefront product JSON and retries once.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var STORAGE_KEY = "q8-occasion"; // shared with the cart block's Options step

  var blocks = document.querySelectorAll("[data-quali8-occasions]");
  if (!blocks.length) return;

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Utilities -------------------------------------------------------------

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

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function fill(template, values) {
    return String(template || "").replace(/\{(\w+)\}/g, function (match, key) {
      return values[key] != null ? values[key] : match;
    });
  }

  function svgIcon(pathD) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }

  function numericId(gid) {
    return String(gid || "").split("/").pop();
  }

  function storageGet(key) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "null");
    } catch (e) {
      return null;
    }
  }
  function storageSet(key, value) {
    try {
      if (value == null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* private mode */
    }
  }

  // --- Data --------------------------------------------------------------------

  function fetchJson(path) {
    return fetch(ROOT + path, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function fetchBlock() {
    return fetchJson("apps/quali8/occasions");
  }

  function fetchGifts(block, settings, slug) {
    var params = new URLSearchParams();
    params.set("occasion", slug);
    params.set("fallback", "0");
    params.set("limit", String(settings.giftLimit || 8));
    if (block.dataset.productId) params.set("exclude", block.dataset.productId);
    return fetchJson("apps/quali8/recommendations?" + params.toString());
  }

  // --- Cart --------------------------------------------------------------------

  /** The variant the shopper has selected on this page right now, else the block's default. */
  function currentVariantId(block) {
    var form = document.querySelector('form[action*="/cart/add"]');
    var input = form && form.querySelector('[name="id"]');
    var live = input && input.value && /^\d+$/.test(input.value) ? input.value : null;
    return live || block.dataset.variantId || null;
  }

  function postItems(items) {
    return fetch(ROOT + "cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: items }),
    }).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok) {
          throw new Error((payload && (payload.description || payload.message)) || "HTTP " + response.status);
        }
        return payload;
      });
    });
  }

  function resolveAvailableVariant(handle) {
    return fetchJson("products/" + handle + ".js").then(function (product) {
      var available = ((product && product.variants) || []).filter(function (v) {
        return v.available;
      })[0];
      return available ? available.id : null;
    });
  }

  /** Adds the gift — and the product being viewed when the merchant pairs them. */
  function addGift(block, settings, product) {
    var giftId = numericId(product.variantId);
    var mainId = settings.pairWithProduct !== false ? currentVariantId(block) : null;
    function attempt(id) {
      var items = [{ id: Number(id), quantity: 1 }];
      if (mainId && String(mainId) !== String(id)) items.unshift({ id: Number(mainId), quantity: 1 });
      return postItems(items);
    }
    return attempt(giftId).catch(function (originalError) {
      if (!product.handle) throw originalError;
      return resolveAvailableVariant(product.handle).then(function (liveId) {
        if (!liveId || String(liveId) === giftId) throw originalError;
        return attempt(liveId);
      });
    });
  }

  function announceCartChange(payload) {
    try {
      document.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true, detail: payload }));
      document.dispatchEvent(new CustomEvent("quali8:cart:added", { bubbles: true, detail: payload }));
    } catch (e) {
      /* nothing to announce to */
    }
  }

  // --- Chips -------------------------------------------------------------------

  function chip(settings, occasion, extraClass) {
    var button = el("button", "q8-og__chip" + (extraClass ? " " + extraClass : ""));
    button.type = "button";
    if (occasion.icon) button.appendChild(el("span", "q8-og__chip-icon", occasion.icon));
    button.appendChild(el("span", "q8-og__chip-name", occasion.name));
    if (occasion.inSeason && settings.showNowBadge !== false && settings.nowLabel) {
      button.appendChild(el("span", "q8-og__now", settings.nowLabel));
    }
    return button;
  }

  // --- Stage 1: the question ---------------------------------------------------

  function renderPrompt(block, data) {
    var settings = data.settings;
    block.textContent = "";
    var head = el("div", "q8-og__header");
    if (settings.heading) head.appendChild(el("h2", "q8-og__heading", settings.heading));
    if (settings.subheading) head.appendChild(el("p", "q8-og__subheading", settings.subheading));
    block.appendChild(head);

    var bySlug = {};
    data.occasions.forEach(function (occasion) { bySlug[occasion.slug] = occasion; });
    var suggested = (data.suggested || []).map(function (slug) { return bySlug[slug]; }).filter(Boolean);
    if (!suggested.length) suggested = data.occasions.slice(0, 3);

    var chips = el("div", "q8-og__chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", settings.heading || "Occasions");
    suggested.forEach(function (occasion, index) {
      var button = chip(settings, occasion);
      button.style.setProperty("--i", String(index));
      button.addEventListener("click", function () {
        choose(block, data, occasion);
      });
      chips.appendChild(button);
    });
    if (data.occasions.length > suggested.length) {
      var other = el("button", "q8-og__chip q8-og__chip--other");
      other.type = "button";
      other.setAttribute("aria-haspopup", "dialog");
      other.style.setProperty("--i", String(suggested.length));
      other.appendChild(el("span", "q8-og__chip-name", settings.otherLabel || "Other occasions"));
      other.appendChild(svgIcon("M 6 3 L 11 8 L 6 13"));
      other.addEventListener("click", function () {
        openPicker(block, data, other);
      });
      chips.appendChild(other);
    }
    block.appendChild(chips);
    block.hidden = false;
  }

  function choose(block, data, occasion) {
    if (data.settings.rememberChoice !== false) storageSet(STORAGE_KEY, { slug: occasion.slug, name: occasion.name });
    renderGifts(block, data, occasion);
  }

  // --- Picker popup ------------------------------------------------------------

  function openPicker(block, data, trigger) {
    var settings = data.settings;
    var overlay = el("div", "q8-og__overlay");
    // Appended to <body>: carry the block's variables and modifiers over so
    // theme-editor styling applies inside the popup.
    overlay.setAttribute("style", block.getAttribute("style") || "");
    Array.prototype.forEach.call(block.classList, function (name) {
      if (name.indexOf("q8-og--") === 0) overlay.classList.add("q8-og__overlay--" + name.slice(7));
    });

    var modal = el("div", "q8-og__modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", settings.pickerTitle || "Occasions");
    modal.tabIndex = -1;

    var head = el("div", "q8-og__modal-head");
    head.appendChild(el("h3", "q8-og__modal-title", settings.pickerTitle || "Which occasion?"));
    var close = el("button", "q8-og__close");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.appendChild(svgIcon("M 4 4 L 12 12 M 12 4 L 4 12"));
    head.appendChild(close);
    modal.appendChild(head);

    var list = el("div", "q8-og__picker");
    data.occasions.forEach(function (occasion, index) {
      var button = chip(settings, occasion, "q8-og__chip--pick");
      button.style.setProperty("--i", String(index));
      button.addEventListener("click", function () {
        dismiss(true);
        choose(block, data, occasion);
      });
      list.appendChild(button);
    });
    modal.appendChild(list);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.documentElement.classList.add("q8-og-open");
    setTimeout(function () {
      var first = list.querySelector("button");
      (first || modal).focus({ preventScroll: true });
    }, 30);

    function dismiss(chosen) {
      overlay.classList.add("q8-og__overlay--out");
      document.documentElement.classList.remove("q8-og-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (!chosen && trigger && trigger.focus) trigger.focus({ preventScroll: true });
      }, reducedMotion ? 0 : 200);
    }
    function onKey(event) {
      if (event.key === "Escape") dismiss(false);
    }
    close.addEventListener("click", function () { dismiss(false); });
    if (block.dataset.closeOnOverlay !== "false") {
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) dismiss(false);
      });
    }
    document.addEventListener("keydown", onKey);
  }

  // --- Stage 2: the gifts ------------------------------------------------------

  function skeletonRail(count) {
    var rail = el("div", "q8-og__rail q8-og__rail--skeleton");
    rail.setAttribute("aria-hidden", "true");
    for (var i = 0; i < count; i += 1) {
      var card = el("div", "q8-og__card q8-og__card--skeleton");
      card.appendChild(el("div", "q8-og__media"));
      var body = el("div", "q8-og__body");
      body.appendChild(el("span", "q8-og__bone q8-og__bone--title"));
      body.appendChild(el("span", "q8-og__bone q8-og__bone--price"));
      body.appendChild(el("span", "q8-og__bone q8-og__bone--button"));
      card.appendChild(body);
      rail.appendChild(card);
    }
    return rail;
  }

  function renderGifts(block, data, occasion) {
    var settings = data.settings;
    block.textContent = "";
    block.classList.add("q8-og--chosen");

    var head = el("div", "q8-og__gifts-head");
    if (occasion.icon) head.appendChild(el("span", "q8-og__gifts-icon", occasion.icon));
    var titles = el("div", "q8-og__gifts-titles");
    titles.appendChild(el("h2", "q8-og__heading", fill(settings.giftsHeading || "Gifts for {occasion}", { occasion: occasion.name })));
    if (settings.giftsSubtext) titles.appendChild(el("p", "q8-og__subheading", settings.giftsSubtext));
    head.appendChild(titles);
    var change = el("button", "q8-og__change", settings.changeLabel || "Change occasion");
    change.type = "button";
    change.addEventListener("click", function () {
      storageSet(STORAGE_KEY, null);
      block.classList.remove("q8-og--chosen");
      renderPrompt(block, data);
    });
    head.appendChild(change);
    block.appendChild(head);

    var content = el("div", "q8-og__gifts");
    content.appendChild(skeletonRail(Math.min(settings.giftLimit || 8, 4)));
    block.appendChild(content);
    var errorLine = el("p", "q8-og__error");
    errorLine.hidden = true;
    block.appendChild(errorLine);
    block.hidden = false;

    fetchGifts(block, settings, occasion.slug)
      .then(function (result) {
        content.textContent = "";
        var products = (result && result.products) || [];
        if (!products.length) {
          content.appendChild(el("p", "q8-og__empty", settings.emptyText || "No gift picks for this occasion yet."));
          return;
        }
        var rail = el("div", "q8-og__rail");
        products.forEach(function (product, index) {
          rail.appendChild(giftCard(block, settings, product, index, errorLine));
        });
        content.appendChild(rail);
      })
      .catch(function () {
        content.textContent = "";
        content.appendChild(el("p", "q8-og__empty", settings.emptyText || "No gift picks for this occasion yet."));
      });
  }

  function giftCard(block, settings, product, index, errorLine) {
    var currency = block.dataset.currency;
    var card = el("article", "q8-og__card");
    card.style.setProperty("--i", String(index));
    var productUrl = product.handle ? ROOT + "products/" + product.handle : null;

    var media = el("div", "q8-og__media");
    if (product.imageUrl) {
      var img = document.createElement("img");
      img.src = product.imageUrl;
      img.alt = product.title;
      img.loading = "lazy";
      media.appendChild(img);
    } else {
      media.appendChild(el("span", "q8-og__media-placeholder"));
    }
    if (productUrl) {
      var link = document.createElement("a");
      link.className = "q8-og__media-link";
      link.href = productUrl;
      link.setAttribute("aria-label", product.title);
      link.appendChild(media);
      card.appendChild(link);
    } else {
      card.appendChild(media);
    }

    var body = el("div", "q8-og__body");
    var title = el("h4", "q8-og__title");
    if (productUrl) {
      var titleLink = document.createElement("a");
      titleLink.href = productUrl;
      titleLink.textContent = product.title;
      title.appendChild(titleLink);
    } else {
      title.textContent = product.title;
    }
    body.appendChild(title);
    body.appendChild(el("p", "q8-og__price", formatMoney(product.price, currency)));

    // The pairing line: what one tap puts in the cart, and for how much.
    var pairing = settings.pairWithProduct !== false && block.dataset.productTitle;
    if (pairing) {
      var mainPrice = Number(block.dataset.productPrice || 0) / 100;
      body.appendChild(el("p", "q8-og__pair", "+ " + block.dataset.productTitle + " · " + formatMoney(mainPrice + (Number(product.price) || 0), currency)));
    }

    if (product.variantId) {
      var button = el("button", "q8-og__add");
      button.type = "button";
      var label = el("span", "q8-og__add-label", settings.addLabel || "Add both to cart");
      button.appendChild(label);

      function setState(state, text) {
        button.classList.remove("q8-og__add--busy", "q8-og__add--done");
        var old = button.querySelector(".q8-og__spinner");
        if (old) button.removeChild(old);
        if (state === "busy") {
          button.classList.add("q8-og__add--busy");
          var spinner = el("span", "q8-og__spinner");
          spinner.setAttribute("aria-hidden", "true");
          button.insertBefore(spinner, label);
        }
        if (state === "done") button.classList.add("q8-og__add--done");
        label.textContent = text;
      }

      button.addEventListener("click", function () {
        button.disabled = true;
        setState("busy", settings.addingLabel || "Adding…");
        errorLine.hidden = true;
        addGift(block, settings, product)
          .then(function (payload) {
            announceCartChange(payload);
            if (settings.afterAdd === "cart") {
              window.location.href = ROOT + "cart";
              return;
            }
            setState("done", settings.addedLabel || "Added ✓");
            setTimeout(function () {
              button.disabled = false;
              setState("idle", settings.addLabel || "Add both to cart");
            }, 2500);
          })
          .catch(function (error) {
            button.disabled = false;
            setState("idle", settings.addLabel || "Add both to cart");
            errorLine.textContent = "Couldn't add to cart: " + (error && error.message ? error.message : "please try again.");
            errorLine.hidden = false;
            if (window.console && console.error) console.error("Quali8 Occasions + Gifts add-to-cart failed:", error);
          });
      });
      body.appendChild(button);
    }
    card.appendChild(body);
    return card;
  }

  // --- Boot --------------------------------------------------------------------

  blocks.forEach(function (block) {
    fetchBlock()
      .then(function (data) {
        if (!data || !data.enabled || !data.occasions || !data.occasions.length) return;
        data.settings = data.settings || {};
        var remembered = data.settings.rememberChoice !== false ? storageGet(STORAGE_KEY) : null;
        var match = remembered && data.occasions.filter(function (occasion) {
          return occasion.slug === remembered.slug;
        })[0];
        if (match) renderGifts(block, data, match);
        else renderPrompt(block, data);
      })
      .catch(function () {
        block.hidden = true; // never break the storefront
      });
  });
})();
