/*
 * Quali8 — Smart Recommendations (home page).
 *
 * Reads three signals — the live cart (/cart.js), the products the shopper
 * viewed (localStorage written by the Smart recs tracker embed), and the
 * first-visit date — asks the app proxy which rule applies for this block's
 * rail slot, and renders the products. For "related to what they viewed"
 * rules the app returns a seed product and the block asks Shopify's public
 * /recommendations/products.json itself. Cards link to the product; the
 * quick Add button posts to /cart/add.js. The block stays hidden until it
 * has something to show.
 *
 * All DOM is built with createElement/textContent — never innerHTML with
 * remote data.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var VIEWED_KEY = "q8-viewed"; // written by smart-tracker.js
  var FIRST_SEEN_KEY = "q8-first-seen";

  var blocks = document.querySelectorAll("[data-quali8-smart-recs]");
  if (!blocks.length) return;

  // --- Utilities -------------------------------------------------------------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
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

  function numericId(value) {
    return String(value || "").split("/").pop();
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function localDate() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    return d.getFullYear() + "-" + (m.length === 1 ? "0" + m : m) + "-" + (day.length === 1 ? "0" + day : day);
  }

  function fetchJson(path) {
    return fetch(ROOT + path, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  // --- Signals ---------------------------------------------------------------

  function readViewed() {
    var viewed = [];
    try {
      viewed = JSON.parse(storageGet(VIEWED_KEY) || "[]");
    } catch (e) {
      viewed = [];
    }
    if (!Array.isArray(viewed)) viewed = [];
    var productIds = [];
    var collectionIds = [];
    viewed.forEach(function (entry) {
      if (!entry || !/^\d+$/.test(String(entry.id))) return;
      productIds.push(String(entry.id));
      (entry.collections || []).forEach(function (id) {
        if (/^\d+$/.test(String(id)) && collectionIds.indexOf(String(id)) === -1) collectionIds.push(String(id));
      });
    });
    return { productIds: productIds.slice(0, 12), collectionIds: collectionIds.slice(0, 24) };
  }

  function isReturning() {
    var firstSeen = storageGet(FIRST_SEEN_KEY);
    return Boolean(firstSeen) && firstSeen !== localDate();
  }

  function fetchCart() {
    return fetchJson("cart.js").catch(function () {
      return { items: [], items_subtotal_price: 0 };
    });
  }

  function fetchRail(block, cart) {
    var viewed = readViewed();
    var params = new URLSearchParams();
    params.set(
      "cart",
      (cart.items || []).map(function (item) { return item.product_id; }).filter(Boolean).join(","),
    );
    params.set("total", String((cart.items_subtotal_price || 0) / 100));
    params.set("viewed", viewed.productIds.join(","));
    params.set("viewedCollections", viewed.collectionIds.join(","));
    params.set("returning", isReturning() ? "1" : "0");
    params.set("slot", block.dataset.slot || "1");
    params.set("limit", block.dataset.limit || "4");
    return fetchJson("apps/quali8/smart-recommendations?" + params.toString());
  }

  /** Shopify's public related products for a seed, mapped to the app's product shape and filtered. */
  function fetchRelated(related, inCart) {
    var params = new URLSearchParams();
    params.set("product_id", related.seedProductId);
    params.set("limit", String(Math.min(12, Math.max(1, related.limit || 4)) + 4));
    params.set("intent", "related");
    return fetchJson("recommendations/products.json?" + params.toString()).then(function (data) {
      var out = [];
      ((data && data.products) || []).forEach(function (product) {
        if (out.length >= related.limit) return;
        var id = String(product.id);
        if (related.excludeCartItems && inCart[id]) return;
        var price = Number(product.price) / 100;
        if (related.minPrice != null && price < related.minPrice) return;
        if (related.maxPrice != null && price > related.maxPrice) return;
        var variant = (product.variants || []).filter(function (v) { return v.available; })[0];
        out.push({
          productId: id,
          variantId: variant ? String(variant.id) : null,
          title: product.title,
          price: price,
          imageUrl: product.featured_image || null,
          handle: product.handle || null,
          hasOptions: (product.variants || []).length > 1,
        });
      });
      return out;
    });
  }

  // --- Cart ------------------------------------------------------------------

  function addVariant(variantId) {
    return fetch(ROOT + "cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity: 1 }] }),
    }).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok) {
          throw new Error((payload && (payload.description || payload.message)) || "HTTP " + response.status);
        }
        return payload;
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

  function productCard(block, product, inCart, errorLine) {
    var ds = block.dataset;
    var card = el("article", "q8-sr__card");
    var productUrl = product.handle ? ROOT + "products/" + product.handle : null;

    var media = el("div", "q8-sr__media");
    if (product.imageUrl) {
      var img = document.createElement("img");
      img.src = product.imageUrl;
      img.alt = product.title || "";
      img.loading = "lazy";
      media.appendChild(img);
    }
    if (productUrl) {
      var mediaLink = document.createElement("a");
      mediaLink.className = "q8-sr__media-link";
      mediaLink.href = productUrl;
      mediaLink.setAttribute("aria-label", product.title || "");
      mediaLink.appendChild(media);
      card.appendChild(mediaLink);
    } else {
      card.appendChild(media);
    }

    var title = el("h3", "q8-sr__title");
    if (productUrl) {
      var titleLink = document.createElement("a");
      titleLink.href = productUrl;
      titleLink.textContent = product.title || "";
      title.appendChild(titleLink);
    } else {
      title.textContent = product.title || "";
    }
    card.appendChild(title);

    if (ds.showPrice !== "false" && typeof product.price === "number") {
      card.appendChild(el("span", "q8-sr__price", formatMoney(product.price, ds.currency)));
    }

    var pid = numericId(product.productId);
    var addLabel = ds.addLabel || "Add to cart";
    var canQuickAdd = Boolean(product.variantId) && !product.hasOptions;
    if (canQuickAdd) {
      var button = el("button", "q8-sr__button", inCart[pid] ? addLabel + " ✓" : addLabel);
      button.type = "button";
      if (inCart[pid]) button.disabled = true;
      button.addEventListener("click", function () {
        button.disabled = true;
        errorLine.hidden = true;
        addVariant(product.variantId)
          .then(function (payload) {
            button.textContent = addLabel + " ✓";
            announceCartChange(payload);
          })
          .catch(function (error) {
            button.disabled = false;
            errorLine.textContent = (error && error.message) || "Could not add to cart.";
            errorLine.hidden = false;
          });
      });
      card.appendChild(button);
    } else if (productUrl) {
      var view = document.createElement("a");
      view.className = "q8-sr__button";
      view.href = productUrl;
      view.textContent = ds.viewLabel || "View";
      card.appendChild(view);
    }
    return card;
  }

  function render(block, heading, products, inCart) {
    block.textContent = "";
    if (!products.length) {
      block.hidden = true;
      return;
    }
    block.appendChild(el("h2", "q8-sr__heading", heading || block.dataset.fallbackHeading || "You might also like"));
    var track = el("div", "q8-sr__track");
    var errorLine = el("p", "q8-sr__error");
    errorLine.hidden = true;
    products.forEach(function (product) {
      track.appendChild(productCard(block, product, inCart, errorLine));
    });
    block.appendChild(track);
    block.appendChild(errorLine);
    block.hidden = false;
  }

  // --- Boot ------------------------------------------------------------------

  fetchCart().then(function (cart) {
    var inCart = {};
    (cart.items || []).forEach(function (item) { inCart[String(item.product_id)] = true; });

    Array.prototype.forEach.call(blocks, function (block) {
      fetchRail(block, cart)
        .then(function (data) {
          if (data && data.related) {
            return fetchRelated(data.related, inCart).then(function (products) {
              render(block, data.heading, products, inCart);
            });
          }
          render(block, data && data.heading, (data && data.products) || [], inCart);
        })
        .catch(function () {
          block.hidden = true;
        });
    });
  });
})();
