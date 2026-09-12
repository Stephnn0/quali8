/*
 * Quali8 — Occasions + Gifts (product pages).
 *
 * Renders a sideways-scrolling row of occasion tiles (icon + name). Tapping
 * a tile opens a popup with gift picks for that occasion from the app
 * proxy. All DOM is built with createElement/textContent — never innerHTML
 * with remote data.
 *
 * Add-to-cart posts form-encoded to the Ajax Cart API; when a variant is
 * rejected (stale id, sold out) and the product handle is known, it
 * re-resolves an available variant from the storefront product JSON and
 * retries once before surfacing the error inline.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";

  var blocks = document.querySelectorAll("[data-quali8-occasions]");
  if (!blocks.length) return;

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fallback icons for occasions saved before icons existed
  var ICONS = [
    [/valentine|love|romance/, "💝"],
    [/mother|mom|mum/, "🌷"],
    [/father|dad/, "👔"],
    [/christmas|xmas|holiday/, "🎄"],
    [/birthday/, "🎂"],
    [/anniversar/, "💍"],
    [/sympathy|condolence|memorial/, "🕊️"],
    [/wedding|bridal|engagement/, "💐"],
    [/baby|shower/, "🍼"],
    [/graduat/, "🎓"],
    [/easter|spring/, "🐣"],
    [/halloween/, "🎃"],
    [/thanksgiving|harvest|autumn|fall/, "🍂"],
    [/new year/, "🎉"],
    [/get well/, "🌼"],
    [/home/, "🏡"],
    [/retire/, "🥂"],
    [/thank/, "🙏"],
    [/congrat|celebrat/, "🥳"],
    [/just because/, "✨"],
  ];

  function iconFor(occasion) {
    if (occasion.icon) return occasion.icon;
    var name = String(occasion.name || "").toLowerCase();
    for (var i = 0; i < ICONS.length; i += 1) {
      if (ICONS[i][0].test(name)) return ICONS[i][1];
    }
    return "🎁";
  }

  // --- Utilities -------------------------------------------------------------

  function readSettings(block) {
    var node = block.querySelector("[data-q8-settings]");
    try {
      return JSON.parse((node && node.textContent) || "{}") || {};
    } catch (e) {
      return {};
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

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
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

  // --- Data --------------------------------------------------------------------

  function fetchPicks(block, settings, occasionSlug) {
    var params = new URLSearchParams();
    if (occasionSlug) params.set("occasion", occasionSlug);
    params.set("limit", String(settings.limit || 6));
    if (block.dataset.productId) params.set("exclude", block.dataset.productId);
    return fetch(ROOT + "apps/quali8/recommendations?" + params.toString(), {
      headers: { Accept: "application/json" },
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  // --- Cart --------------------------------------------------------------------

  function postToCart(variantId) {
    var body = new FormData();
    body.append("id", String(variantId));
    body.append("quantity", "1");
    return fetch(ROOT + "cart/add.js", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: body,
    }).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok) {
          throw new Error(
            (payload && (payload.description || payload.message)) ||
              "HTTP " + response.status,
          );
        }
        return payload;
      });
    });
  }

  function resolveAvailableVariant(handle) {
    return fetch(ROOT + "products/" + handle + ".js", {
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (product) {
        var available = ((product && product.variants) || []).filter(function (v) {
          return v.available;
        })[0];
        return available ? available.id : null;
      });
  }

  function addToCart(product) {
    var firstId = numericId(product.variantId);
    return postToCart(firstId).catch(function (originalError) {
      if (!product.handle) throw originalError;
      return resolveAvailableVariant(product.handle).then(function (liveId) {
        if (!liveId || String(liveId) === firstId) throw originalError;
        return postToCart(liveId);
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

  // --- Tiles -------------------------------------------------------------------

  function arrowButton(direction) {
    var button = el("button", "q8-og__arrow q8-og__arrow--" + direction);
    button.type = "button";
    button.setAttribute("aria-label", direction === "prev" ? "Scroll occasions left" : "Scroll occasions right");
    button.appendChild(svgIcon(direction === "prev" ? "M 10 3 L 5 8 L 10 13" : "M 6 3 L 11 8 L 6 13"));
    return button;
  }

  function tile(settings, occasion, index, onOpen) {
    var button = el("button", "q8-og__tile");
    button.type = "button";
    button.style.setProperty("--i", String(index));
    button.setAttribute("aria-haspopup", "dialog");

    var square = el("span", "q8-og__square");
    square.appendChild(el("span", "q8-og__icon", iconFor(occasion)));
    if (occasion.inSeason && settings.showNowBadge !== false) {
      square.appendChild(el("span", "q8-og__now", settings.nowLabel || "Now"));
    }
    button.appendChild(square);
    button.appendChild(el("span", "q8-og__name", occasion.name));
    button.addEventListener("click", function () {
      onOpen(occasion, button);
    });
    return button;
  }

  function renderTiles(block, settings, occasions) {
    Array.prototype.slice.call(block.children).forEach(function (child) {
      if (!child.hasAttribute("data-q8-settings")) block.removeChild(child);
    });

    var list = occasions.slice();
    if (settings.showAllTile !== false || list.length === 0) {
      list.push({
        slug: null,
        name: settings.allTileLabel || "All gifts",
        icon: settings.allTileIcon || "🎁",
        inSeason: false,
      });
    }

    var header = el("div", "q8-og__header");
    var titles = el("div", "q8-og__titles");
    if (settings.heading) titles.appendChild(el("h2", "q8-og__heading", settings.heading));
    if (settings.subheading) titles.appendChild(el("p", "q8-og__subheading", settings.subheading));
    header.appendChild(titles);

    var prev = arrowButton("prev");
    var next = arrowButton("next");
    var arrows = el("div", "q8-og__arrows");
    arrows.appendChild(prev);
    arrows.appendChild(next);
    arrows.hidden = true;
    if (settings.showArrows !== false) header.appendChild(arrows);
    block.appendChild(header);

    var row = el("div", "q8-og__row");
    row.setAttribute("role", "list");
    list.forEach(function (occasion, index) {
      var item = el("div", "q8-og__item");
      item.setAttribute("role", "listitem");
      item.appendChild(
        tile(settings, occasion, index, function (chosen, trigger) {
          openPopup(block, settings, chosen, trigger);
        }),
      );
      row.appendChild(item);
    });
    block.appendChild(row);
    block.hidden = false;

    function syncArrows() {
      var overflow = row.scrollWidth > row.clientWidth + 4;
      arrows.hidden = !overflow;
      if (!overflow) return;
      prev.disabled = row.scrollLeft <= 4;
      next.disabled = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
    }
    prev.addEventListener("click", function () {
      row.scrollBy({ left: -row.clientWidth * 0.8, behavior: "smooth" });
    });
    next.addEventListener("click", function () {
      row.scrollBy({ left: row.clientWidth * 0.8, behavior: "smooth" });
    });
    row.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows, { passive: true });
    requestAnimationFrame(syncArrows);
  }

  // --- Popup -------------------------------------------------------------------

  function closeButton() {
    var close = el("button", "q8-og__close");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.appendChild(svgIcon("M 4 4 L 12 12 M 12 4 L 4 12"));
    return close;
  }

  function skeletonGrid(count) {
    var grid = el("div", "q8-og__grid q8-og__grid--skeleton");
    grid.setAttribute("aria-hidden", "true");
    for (var i = 0; i < count; i += 1) {
      var card = el("div", "q8-og__card q8-og__card--skeleton");
      card.appendChild(el("div", "q8-og__media"));
      var body = el("div", "q8-og__body");
      body.appendChild(el("span", "q8-og__bone q8-og__bone--title"));
      body.appendChild(el("span", "q8-og__bone q8-og__bone--price"));
      body.appendChild(el("span", "q8-og__bone q8-og__bone--button"));
      card.appendChild(body);
      grid.appendChild(card);
    }
    return grid;
  }

  function openPopup(block, settings, occasion, trigger) {
    var overlay = el("div", "q8-og__overlay");
    // The overlay is appended to <body>: carry the block's variables and
    // modifiers over so theme-editor styling applies inside the popup.
    overlay.setAttribute("style", block.getAttribute("style") || "");
    Array.prototype.forEach.call(block.classList, function (name) {
      if (name.indexOf("q8-og--") === 0) overlay.classList.add("q8-og__overlay--" + name.slice(7));
    });

    var modal = el("div", "q8-og__modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", occasion.name);
    modal.tabIndex = -1;

    var head = el("div", "q8-og__modal-head");
    var badge = el("span", "q8-og__modal-icon", iconFor(occasion));
    head.appendChild(badge);
    var titles = el("div", "q8-og__modal-titles");
    var title = (settings.popupTitle || "Gifts for {occasion}").replace("{occasion}", occasion.name);
    titles.appendChild(el("h3", "q8-og__modal-title", occasion.slug ? title : occasion.name));
    if (settings.popupSubtext) titles.appendChild(el("p", "q8-og__modal-subtext", settings.popupSubtext));
    head.appendChild(titles);
    var close = closeButton();
    head.appendChild(close);
    modal.appendChild(head);

    var content = el("div", "q8-og__modal-body");
    content.appendChild(skeletonGrid(Math.min(settings.limit || 6, 6)));
    modal.appendChild(content);

    var errorLine = el("p", "q8-og__error");
    errorLine.hidden = true;
    modal.appendChild(errorLine);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.documentElement.classList.add("q8-og-open");
    setTimeout(function () {
      modal.focus({ preventScroll: true });
    }, 30);

    function dismiss() {
      overlay.classList.add("q8-og__overlay--out");
      document.documentElement.classList.remove("q8-og-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (trigger && trigger.focus) trigger.focus({ preventScroll: true });
      }, reducedMotion ? 0 : 200);
    }
    function onKey(event) {
      if (event.key === "Escape") dismiss();
    }
    close.addEventListener("click", dismiss);
    if (settings.closeOnOverlay !== false) {
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) dismiss();
      });
    }
    document.addEventListener("keydown", onKey);

    fetchPicks(block, settings, occasion.slug)
      .then(function (data) {
        content.textContent = "";
        if (!data.products || !data.products.length) {
          content.appendChild(el("p", "q8-og__empty", settings.emptyText || "No gift picks yet."));
          return;
        }
        var grid = el("div", "q8-og__grid");
        data.products.forEach(function (product, index) {
          grid.appendChild(productCard(block, settings, product, index, errorLine));
        });
        content.appendChild(grid);
      })
      .catch(function () {
        content.textContent = "";
        content.appendChild(el("p", "q8-og__empty", settings.emptyText || "No gift picks yet."));
      });
  }

  function productCard(block, settings, product, index, errorLine) {
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
    if (settings.showReason !== false && product.reason) {
      media.appendChild(el("span", "q8-og__reason", product.reason));
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
    body.appendChild(el("p", "q8-og__price", formatMoney(product.price, block.dataset.currency)));

    if (product.variantId) {
      var button = el("button", "q8-og__add");
      button.type = "button";
      var label = el("span", "q8-og__add-label", settings.buttonLabel || "Add to cart");
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
        addToCart(product)
          .then(function (payload) {
            announceCartChange(payload);
            if (settings.afterAdd === "cart") {
              window.location.href = ROOT + "cart";
              return;
            }
            setState("done", settings.addedLabel || "Added ✓");
            setTimeout(function () {
              button.disabled = false;
              setState("idle", settings.buttonLabel || "Add to cart");
            }, 2500);
          })
          .catch(function (error) {
            button.disabled = false;
            setState("idle", settings.buttonLabel || "Add to cart");
            errorLine.textContent =
              "Couldn't add to cart: " + (error && error.message ? error.message : "please try again.");
            errorLine.hidden = false;
            if (window.console && console.error) {
              console.error("Quali8 Occasions + Gifts add-to-cart failed:", error);
            }
          });
      });
      body.appendChild(button);
    }

    card.appendChild(body);
    return card;
  }

  // --- Boot --------------------------------------------------------------------

  blocks.forEach(function (block) {
    var settings = readSettings(block);
    // One light call for the occasion list; products load per tile on open.
    var params = new URLSearchParams();
    params.set("limit", "1");
    fetch(ROOT + "apps/quali8/recommendations?" + params.toString(), {
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        var occasions = (data && data.occasions) || [];
        if (!occasions.length && settings.showAllTile === false) return;
        renderTiles(block, settings, occasions);
      })
      .catch(function () {
        block.hidden = true; // never break the storefront
      });
  });
})();
