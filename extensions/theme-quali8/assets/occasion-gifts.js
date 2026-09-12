/*
 * Quali8 — Occasions + Gifts storefront block (product pages).
 *
 * Reads its settings from the JSON blob the Liquid block renders, fetches
 * gift picks for the chosen occasion from the app proxy, and renders
 * occasion chips above a product carousel or grid. The chosen occasion
 * persists in sessionStorage across product pages. All DOM is built with
 * createElement/textContent — never innerHTML with remote data.
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
  var STORE_KEY = "q8-recs-selection";

  var blocks = document.querySelectorAll("[data-quali8-recs]");
  if (!blocks.length) return;

  // --- Utilities -----------------------------------------------------------

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

  function svgIcon(pathD, viewBox) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", viewBox || "0 0 16 16");
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

  function spinner() {
    var wrap = el("span", "q8-om__spinner");
    wrap.setAttribute("aria-hidden", "true");
    return wrap;
  }

  function readSelection() {
    try {
      return JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function writeSelection(selection) {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(selection));
    } catch (e) {
      /* private browsing — selection just won't persist */
    }
  }

  function numericId(gid) {
    return String(gid || "").split("/").pop();
  }

  // --- Data ----------------------------------------------------------------

  function fetchRecommendations(block, settings, selection) {
    var params = new URLSearchParams();
    if (selection.occasion) params.set("occasion", selection.occasion);
    params.set("limit", String(settings.limit || 4));
    if (settings.fallback === "hide") params.set("fallback", "0");

    if (block.dataset.productId) params.set("exclude", block.dataset.productId);

    return fetch(ROOT + "apps/quali8/recommendations?" + params.toString(), {
      headers: { Accept: "application/json" },
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  // --- Cart ----------------------------------------------------------------

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

  /** Storefront-truth fallback: resolve a currently-available variant. */
  function resolveAvailableVariant(handle) {
    return fetch(ROOT + "products/" + handle + ".js", {
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (product) {
        var variants = (product && product.variants) || [];
        var available = variants.filter(function (variant) {
          return variant.available;
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

  /** Let themes with an Ajax cart drawer refresh themselves. */
  function announceCartChange(payload) {
    try {
      document.dispatchEvent(
        new CustomEvent("cart:refresh", { bubbles: true, detail: payload }),
      );
      document.dispatchEvent(
        new CustomEvent("quali8:cart:added", { bubbles: true, detail: payload }),
      );
    } catch (e) {
      /* old browsers — nothing to announce to */
    }
  }

  // --- Filter chips --------------------------------------------------------

  /**
   * One filter: a small label and a row of chips. `options` items are
   * { slug, label, badge? }; the first chip clears the filter.
   */
  function chipGroup(label, allLabel, options, selectedSlug, onPick) {
    var group = el("div", "q8-om__group");
    group.setAttribute("role", "group");
    if (label) {
      group.setAttribute("aria-label", label);
      group.appendChild(el("span", "q8-om__group-label", label));
    }

    var row = el("div", "q8-om__chips");

    function chip(text, slug, badge) {
      var isSelected = slug === (selectedSlug || null);
      var button = el("button", "q8-om__chip");
      button.type = "button";
      button.setAttribute("aria-pressed", isSelected ? "true" : "false");
      if (isSelected) button.classList.add("q8-om__chip--on");
      button.appendChild(el("span", "q8-om__chip-text", text));
      if (badge) button.appendChild(el("span", "q8-om__chip-badge", badge));
      button.addEventListener("click", function () {
        if (isSelected && slug !== null) onPick(null);
        else onPick(slug);
      });
      return button;
    }

    row.appendChild(chip(allLabel, null, null));
    options.forEach(function (option) {
      row.appendChild(chip(option.label, option.slug, option.badge));
    });

    group.appendChild(row);
    return group;
  }

  function arrowButton(direction) {
    var button = el("button", "q8-om__arrow q8-om__arrow--" + direction);
    button.type = "button";
    button.setAttribute(
      "aria-label",
      direction === "prev" ? "Previous products" : "More products",
    );
    button.appendChild(
      svgIcon(direction === "prev" ? "M 10 3 L 5 8 L 10 13" : "M 6 3 L 11 8 L 6 13"),
    );
    return button;
  }

  // --- Render --------------------------------------------------------------

  function render(block, settings, data, selection) {
    // Keep the settings node; rebuild everything else.
    Array.prototype.slice.call(block.children).forEach(function (child) {
      if (!child.hasAttribute("data-q8-settings")) block.removeChild(child);
    });

    var hasSelection = Boolean(selection.occasion);

    if (!data.products.length && !hasSelection && !selection.touched) {
      // Nothing to show and the shopper hasn't interacted — stay hidden.
      block.hidden = true;
      return;
    }
    block.hidden = false;

    // Header: heading, subheading, carousel arrows
    var header = el("div", "q8-om__header");
    var titles = el("div", "q8-om__titles");
    if (settings.heading) {
      titles.appendChild(el("h2", "q8-om__heading", settings.heading));
    }
    if (settings.subheading) {
      titles.appendChild(el("p", "q8-om__subheading", settings.subheading));
    }
    header.appendChild(titles);

    var prev = arrowButton("prev");
    var next = arrowButton("next");
    var arrows = el("div", "q8-om__arrows");
    arrows.appendChild(prev);
    arrows.appendChild(next);
    arrows.hidden = true;
    if (settings.layout !== "grid") header.appendChild(arrows);
    block.appendChild(header);

    // Occasion chips
    if (settings.showOccasions !== false && data.occasions.length > 0) {
      var filters = el("div", "q8-om__filters");
      filters.appendChild(
        chipGroup(
          settings.occasionLabel,
          settings.anyOccasionLabel || "Any occasion",
          data.occasions.map(function (occasion) {
            return {
              slug: occasion.slug,
              label: occasion.name,
              badge: occasion.inSeason ? settings.nowLabel || "Now" : null,
            };
          }),
          selection.occasion,
          function (slug) {
            update(block, settings, { occasion: slug });
          },
        ),
      );
      block.appendChild(filters);
    }

    // Products
    if (!data.products.length) {
      block.appendChild(
        el(
          "p",
          "q8-om__empty",
          settings.emptyText || "No matches for these filters yet.",
        ),
      );
      return;
    }

    var track = el(
      "div",
      settings.layout === "grid" ? "q8-om__grid" : "q8-om__track",
    );
    data.products.forEach(function (product) {
      track.appendChild(productCard(block, settings, product));
    });
    block.appendChild(track);

    var errorLine = el("p", "q8-om__error");
    errorLine.hidden = true;
    block.appendChild(errorLine);
    block.q8ErrorLine = errorLine;

    if (settings.layout === "grid") return;

    function syncArrows() {
      var overflow = track.scrollWidth > track.clientWidth + 4;
      arrows.hidden = !overflow;
      if (!overflow) return;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    }
    prev.addEventListener("click", function () {
      track.scrollBy({ left: -track.clientWidth * 0.9, behavior: "smooth" });
    });
    next.addEventListener("click", function () {
      track.scrollBy({ left: track.clientWidth * 0.9, behavior: "smooth" });
    });
    track.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows, { passive: true });
    requestAnimationFrame(syncArrows);
  }

  function productCard(block, settings, product) {
    var card = el("article", "q8-om__card");
    var productUrl = product.handle ? ROOT + "products/" + product.handle : null;

    // Media (with the reason tag overlaid)
    var media = el("div", "q8-om__media");
    if (product.imageUrl) {
      var img = document.createElement("img");
      img.src = product.imageUrl;
      img.alt = product.title;
      img.loading = "lazy";
      media.appendChild(img);
    } else {
      media.appendChild(el("span", "q8-om__media-placeholder"));
    }
    if (settings.showReason !== false && product.reason) {
      media.appendChild(el("span", "q8-om__reason", product.reason));
    }
    if (productUrl) {
      var mediaLink = document.createElement("a");
      mediaLink.className = "q8-om__media-link";
      mediaLink.href = productUrl;
      mediaLink.setAttribute("aria-label", product.title);
      mediaLink.appendChild(media);
      card.appendChild(mediaLink);
    } else {
      card.appendChild(media);
    }

    // Body
    var body = el("div", "q8-om__body");
    var title = el("h3", "q8-om__title");
    if (productUrl) {
      var titleLink = document.createElement("a");
      titleLink.href = productUrl;
      titleLink.textContent = product.title;
      title.appendChild(titleLink);
    } else {
      title.textContent = product.title;
    }
    body.appendChild(title);
    body.appendChild(
      el("p", "q8-om__price", formatMoney(product.price, block.dataset.currency)),
    );

    if (product.variantId) {
      var button = el("button", "q8-om__add");
      button.type = "button";
      var label = el("span", "q8-om__add-label", settings.buttonLabel || "Add to cart");
      button.appendChild(label);

      function setState(state, text) {
        button.classList.remove("q8-om__add--busy", "q8-om__add--done");
        var old = button.querySelector(".q8-om__spinner");
        if (old) button.removeChild(old);
        if (state === "busy") {
          button.classList.add("q8-om__add--busy");
          button.insertBefore(spinner(), label);
        }
        if (state === "done") button.classList.add("q8-om__add--done");
        label.textContent = text;
      }

      button.addEventListener("click", function () {
        button.disabled = true;
        setState("busy", settings.addingLabel || "Adding…");
        if (block.q8ErrorLine) block.q8ErrorLine.hidden = true;

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
            if (block.q8ErrorLine) {
              block.q8ErrorLine.textContent =
                "Couldn't add to cart: " +
                (error && error.message ? error.message : "please try again.");
              block.q8ErrorLine.hidden = false;
            }
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

  // --- State ---------------------------------------------------------------

  function update(block, settings, patch) {
    var selection = readSelection();
    Object.keys(patch).forEach(function (key) {
      selection[key] = patch[key];
    });
    selection.touched = true;
    writeSelection(selection);
    block.classList.add("q8-om--loading");
    load(block, settings, selection);
  }

  function load(block, settings, selection) {
    fetchRecommendations(block, settings, selection)
      .then(function (data) {
        block.classList.remove("q8-om--loading");
        render(block, settings, data, selection);
      })
      .catch(function () {
        // Never break the storefront — leave the block hidden.
        block.classList.remove("q8-om--loading");
        block.hidden = true;
      });
  }

  blocks.forEach(function (block) {
    load(block, readSettings(block), readSelection());
  });
})();
