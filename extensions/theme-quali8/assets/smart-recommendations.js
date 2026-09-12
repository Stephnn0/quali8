/*
 * Quali8 — Smart Recommendations (cart page).
 *
 * Sends the cart's product ids and subtotal to the app proxy; the
 * merchant's rules pick the products. Renders a scrolling rail, grid, or
 * compact list with one-tap add to cart. All DOM is built with
 * createElement/textContent — never innerHTML with remote data.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";

  var blocks = document.querySelectorAll("[data-quali8-smart-recs]");
  if (!blocks.length) return;

  function readSettings(block) {
    var node = block.querySelector("[data-q8-sr-settings]");
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

  // --- Data ------------------------------------------------------------------

  function fetchRecommendations(block, settings) {
    var params = new URLSearchParams();
    if (block.dataset.cartProductIds) params.set("cart", block.dataset.cartProductIds);
    if (block.dataset.cartTotal) params.set("total", block.dataset.cartTotal);
    params.set("limit", String(settings.limit || 6));
    return fetch(ROOT + "apps/quali8/smart-recommendations?" + params.toString(), {
      headers: { Accept: "application/json" },
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  // --- Cart ------------------------------------------------------------------

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

  // --- Render ----------------------------------------------------------------

  function arrowButton(direction) {
    var button = el("button", "q8-sr__arrow q8-sr__arrow--" + direction);
    button.type = "button";
    button.setAttribute("aria-label", direction === "prev" ? "Previous products" : "More products");
    button.appendChild(svgIcon(direction === "prev" ? "M 10 3 L 5 8 L 10 13" : "M 6 3 L 11 8 L 6 13"));
    return button;
  }

  function render(block, settings, data) {
    Array.prototype.slice.call(block.children).forEach(function (child) {
      if (!child.hasAttribute("data-q8-sr-settings")) block.removeChild(child);
    });

    if (!data.products || !data.products.length) {
      block.hidden = true;
      return;
    }
    block.hidden = false;

    var header = el("div", "q8-sr__header");
    var titles = el("div", "q8-sr__titles");
    if (settings.eyebrow) titles.appendChild(el("span", "q8-sr__eyebrow", settings.eyebrow));
    var heading =
      settings.useRuleHeading !== false && data.heading ? data.heading : settings.heading;
    if (heading) titles.appendChild(el("h2", "q8-sr__heading", heading));
    if (settings.subheading) titles.appendChild(el("p", "q8-sr__subheading", settings.subheading));
    header.appendChild(titles);

    var prev = arrowButton("prev");
    var next = arrowButton("next");
    var arrows = el("div", "q8-sr__arrows");
    arrows.appendChild(prev);
    arrows.appendChild(next);
    arrows.hidden = true;
    if (settings.layout === "rail") header.appendChild(arrows);
    block.appendChild(header);

    var track = el("div", "q8-sr__track q8-sr__track--" + (settings.layout || "rail"));
    data.products.forEach(function (product, index) {
      track.appendChild(productCard(block, settings, product, index));
    });
    block.appendChild(track);

    var errorLine = el("p", "q8-sr__error");
    errorLine.hidden = true;
    block.appendChild(errorLine);
    block.q8ErrorLine = errorLine;

    if (settings.layout !== "rail") return;

    function syncArrows() {
      var overflow = track.scrollWidth > track.clientWidth + 4;
      arrows.hidden = !overflow;
      if (!overflow) return;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
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

  function productCard(block, settings, product, index) {
    var card = el("article", "q8-sr__card");
    card.style.setProperty("--i", String(index));
    var productUrl = product.handle ? ROOT + "products/" + product.handle : null;

    var media = el("div", "q8-sr__media");
    if (product.imageUrl) {
      var img = document.createElement("img");
      img.src = product.imageUrl;
      img.alt = product.title;
      img.loading = "lazy";
      media.appendChild(img);
    } else {
      media.appendChild(el("span", "q8-sr__media-placeholder"));
    }
    var mediaWrap;
    if (productUrl) {
      mediaWrap = document.createElement("a");
      mediaWrap.className = "q8-sr__media-link";
      mediaWrap.href = productUrl;
      mediaWrap.setAttribute("aria-label", product.title);
      mediaWrap.appendChild(media);
    } else {
      mediaWrap = media;
    }

    var body = el("div", "q8-sr__body");
    var title = el("h3", "q8-sr__title");
    if (productUrl) {
      var link = document.createElement("a");
      link.href = productUrl;
      link.textContent = product.title;
      title.appendChild(link);
    } else {
      title.textContent = product.title;
    }
    body.appendChild(title);
    if (settings.showPrice !== false) {
      body.appendChild(el("p", "q8-sr__price", formatMoney(product.price, block.dataset.currency)));
    }

    var button = null;
    if (product.variantId) {
      button = el("button", "q8-sr__add");
      button.type = "button";
      button.setAttribute("aria-label", (settings.buttonLabel || "Add") + ": " + product.title);
      var icon = svgIcon("M 8 3.5 V 12.5 M 3.5 8 H 12.5");
      var label = el("span", "q8-sr__add-label", settings.buttonLabel || "Add");
      button.appendChild(icon);
      button.appendChild(label);

      function setState(state, text) {
        button.classList.remove("q8-sr__add--busy", "q8-sr__add--done");
        if (state === "busy") button.classList.add("q8-sr__add--busy");
        if (state === "done") button.classList.add("q8-sr__add--done");
        label.textContent = text;
      }

      button.addEventListener("click", function () {
        button.disabled = true;
        setState("busy", settings.addingLabel || "Adding…");
        if (block.q8ErrorLine) block.q8ErrorLine.hidden = true;
        addToCart(product)
          .then(function (payload) {
            announceCartChange(payload);
            setState("done", settings.addedLabel || "Added ✓");
            if (settings.afterAdd !== "stay") {
              setTimeout(function () {
                window.location.reload();
              }, 350);
              return;
            }
            setTimeout(function () {
              button.disabled = false;
              setState("idle", settings.buttonLabel || "Add");
            }, 2500);
          })
          .catch(function (error) {
            button.disabled = false;
            setState("idle", settings.buttonLabel || "Add");
            if (block.q8ErrorLine) {
              block.q8ErrorLine.textContent =
                "Couldn't add to cart: " + (error && error.message ? error.message : "please try again.");
              block.q8ErrorLine.hidden = false;
            }
            if (window.console && console.error) {
              console.error("Quali8 Smart Recommendations add-to-cart failed:", error);
            }
          });
      });
    }

    // Pill style: the button floats on the image. Full style: under the body.
    var pill = block.classList.contains("q8-sr--btn-pill");
    if (button && pill) media.appendChild(button);
    card.appendChild(mediaWrap);
    card.appendChild(body);
    if (button && !pill) body.appendChild(button);
    return card;
  }

  blocks.forEach(function (block) {
    var settings = readSettings(block);
    fetchRecommendations(block, settings)
      .then(function (data) {
        render(block, settings, data);
      })
      .catch(function () {
        block.hidden = true; // never break the storefront
      });
  });
})();
