/*
 * Quali8 — Smart Recommendations.
 *
 * Fetches occasion/recipient/budget-aware product picks from the app proxy
 * and renders a subtle filter row above a scroll-snap product carousel.
 * Selections persist in sessionStorage so the cart block continues where
 * the product page left off. All DOM is built with createElement/
 * textContent — never innerHTML with remote data.
 *
 * Add-to-cart posts form-encoded to the Ajax Cart API (the most
 * theme-compatible shape) and surfaces failures inline instead of failing
 * silently.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var STORE_KEY = "q8-recs-selection";

  var blocks = document.querySelectorAll("[data-quali8-recs]");
  if (!blocks.length) return;

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

  function fetchRecommendations(block, selection) {
    var params = new URLSearchParams();
    if (selection.occasion) params.set("occasion", selection.occasion);
    if (selection.recipient) params.set("recipient", selection.recipient);
    if (selection.budget) params.set("budget", selection.budget);

    var exclude = [];
    if (block.dataset.productId) exclude.push(block.dataset.productId);
    if (block.dataset.cartProductIds) {
      exclude = exclude.concat(block.dataset.cartProductIds.split(","));
    }
    if (exclude.length) params.set("exclude", exclude.join(","));

    return fetch(ROOT + "apps/quali8/recommendations?" + params.toString(), {
      headers: { Accept: "application/json" },
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function addToCart(variantGid) {
    // Form-encoded is the most broadly compatible Ajax Cart API shape —
    // JSON bodies are mishandled by some cart apps that intercept fetch.
    var body = new FormData();
    body.append("id", numericId(variantGid));
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

  /** Subtle inline select for the filter row. */
  function filterSelect(placeholder, options, selectedSlug, onPick) {
    var select = document.createElement("select");
    select.className = "q8-recs__filter";
    select.setAttribute("aria-label", placeholder);

    var any = document.createElement("option");
    any.value = "";
    any.textContent = placeholder;
    select.appendChild(any);

    options.forEach(function (option) {
      var node = document.createElement("option");
      node.value = option.slug;
      node.textContent = option.label;
      if (option.slug === selectedSlug) node.selected = true;
      select.appendChild(node);
    });

    if (selectedSlug) select.classList.add("q8-recs__filter--active");
    select.addEventListener("change", function () {
      onPick(select.value || null);
    });
    return select;
  }

  function arrowButton(direction) {
    var button = el("button", "q8-recs__arrow q8-recs__arrow--" + direction);
    button.type = "button";
    button.setAttribute(
      "aria-label",
      direction === "prev" ? "Previous products" : "More products",
    );
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      direction === "prev" ? "M 10 3 L 5 8 L 10 13" : "M 6 3 L 11 8 L 6 13",
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    button.appendChild(svg);
    return button;
  }

  function render(block, data, selection) {
    block.textContent = "";

    if (!data.products.length && !selection.touched) {
      // Nothing to show and the shopper hasn't interacted — stay hidden.
      block.hidden = true;
      return;
    }
    block.hidden = false;

    // --- Header: heading + carousel arrows -------------------------------
    var header = el("div", "q8-recs__header");
    var heading = block.dataset.heading;
    if (heading) header.appendChild(el("h2", "q8-recs__heading", heading));

    var prev = arrowButton("prev");
    var next = arrowButton("next");
    var arrows = el("div", "q8-recs__arrows");
    arrows.appendChild(prev);
    arrows.appendChild(next);
    header.appendChild(arrows);
    block.appendChild(header);

    // --- Subtle filter row ------------------------------------------------
    if (block.dataset.showPicker === "true") {
      var filters = el("div", "q8-recs__filters");
      filters.appendChild(el("span", "q8-recs__filters-label", "Refine"));
      if (data.occasions.length) {
        filters.appendChild(
          filterSelect(
            "Any occasion",
            data.occasions.map(function (occasion) {
              return {
                slug: occasion.slug,
                label: occasion.name + (occasion.inSeason ? " · now" : ""),
              };
            }),
            selection.occasion,
            function (slug) {
              update(block, { occasion: slug });
            },
          ),
        );
      }
      filters.appendChild(
        filterSelect("Anyone", data.recipients, selection.recipient, function (slug) {
          update(block, { recipient: slug });
        }),
      );
      filters.appendChild(
        filterSelect("Any budget", data.budgets, selection.budget, function (slug) {
          update(block, { budget: slug });
        }),
      );
      block.appendChild(filters);
    }

    if (!data.products.length) {
      block.appendChild(
        el(
          "p",
          "q8-recs__empty",
          "No matches for these filters — try a different budget or occasion.",
        ),
      );
      arrows.hidden = true;
      return;
    }

    // --- Carousel ---------------------------------------------------------
    var track = el("div", "q8-recs__track");
    data.products.forEach(function (product) {
      track.appendChild(productCard(block, product));
    });
    block.appendChild(track);

    var errorLine = el("p", "q8-recs__error");
    errorLine.hidden = true;
    block.appendChild(errorLine);
    block.q8ErrorLine = errorLine;

    // Arrow behavior: scroll one viewport of cards, hide when not needed
    function syncArrows() {
      var overflow = track.scrollWidth > track.clientWidth + 4;
      arrows.hidden = !overflow;
      if (!overflow) return;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    }
    prev.addEventListener("click", function () {
      track.scrollBy({ left: -track.clientWidth, behavior: "smooth" });
    });
    next.addEventListener("click", function () {
      track.scrollBy({ left: track.clientWidth, behavior: "smooth" });
    });
    track.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows, { passive: true });
    // Layout isn't final until images/styles settle
    requestAnimationFrame(syncArrows);
  }

  function productCard(block, product) {
    var card = el("article", "q8-recs__card");

    var media = el("div", "q8-recs__media");
    if (product.imageUrl) {
      var img = document.createElement("img");
      img.src = product.imageUrl;
      img.alt = product.title;
      img.loading = "lazy";
      media.appendChild(img);
    }
    if (product.handle) {
      var link = document.createElement("a");
      link.className = "q8-recs__media-link";
      link.href = ROOT + "products/" + product.handle;
      link.appendChild(media);
      card.appendChild(link);
    } else {
      card.appendChild(media);
    }

    if (product.reason) {
      card.appendChild(el("span", "q8-recs__reason", product.reason));
    }
    card.appendChild(el("h3", "q8-recs__title", product.title));
    card.appendChild(
      el(
        "p",
        "q8-recs__price",
        formatMoney(product.price, block.dataset.currency),
      ),
    );

    if (product.variantId) {
      var button = el(
        "button",
        "q8-recs__add",
        block.dataset.buttonLabel || "Add to cart",
      );
      button.type = "button";
      button.addEventListener("click", function () {
        button.disabled = true;
        if (block.q8ErrorLine) block.q8ErrorLine.hidden = true;

        addToCart(product.variantId)
          .then(function () {
            if (
              block.dataset.afterAdd === "cart" ||
              block.dataset.context === "cart"
            ) {
              window.location.href = ROOT + "cart";
              return;
            }
            button.textContent = block.dataset.addedLabel || "Added ✓";
            button.classList.add("q8-recs__add--added");
            setTimeout(function () {
              button.disabled = false;
              button.classList.remove("q8-recs__add--added");
              button.textContent = block.dataset.buttonLabel || "Add to cart";
            }, 2500);
          })
          .catch(function (error) {
            button.disabled = false;
            if (block.q8ErrorLine) {
              block.q8ErrorLine.textContent =
                "Couldn't add to cart: " + (error && error.message ? error.message : "please try again.");
              block.q8ErrorLine.hidden = false;
            }
            if (window.console && console.error) {
              console.error("Quali8 recommendations add-to-cart failed:", error);
            }
          });
      });
      card.appendChild(button);
    }

    return card;
  }

  function update(block, patch) {
    var selection = readSelection();
    Object.keys(patch).forEach(function (key) {
      selection[key] = patch[key];
    });
    selection.touched = true;
    writeSelection(selection);
    load(block, selection);
  }

  function load(block, selection) {
    fetchRecommendations(block, selection)
      .then(function (data) {
        render(block, data, selection);
      })
      .catch(function () {
        // Never break the storefront — leave the block hidden.
        block.hidden = true;
      });
  }

  blocks.forEach(function (block) {
    load(block, readSelection());
  });
})();
