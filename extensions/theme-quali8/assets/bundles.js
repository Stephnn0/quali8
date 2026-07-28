/*
 * Quali8 — Frequently Bought Together.
 *
 * Fetches the active bundle for the current product from the app proxy and
 * renders a bundle card: item thumbnails, titles, prices, savings, and an
 * "add all to cart" button that posts every variant to the Ajax Cart API in
 * one request. All DOM is built with createElement/textContent — never
 * innerHTML with remote data.
 *
 * The `_quali8_bundle` line property set below is the contract with the
 * bundle-discounts Shopify Function, which applies the percent discount at
 * cart/checkout while the complete bundle is present.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";

  var blocks = document.querySelectorAll("[data-quali8-bundle]");
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

  function fetchBundle(productId) {
    return fetch(
      ROOT + "apps/quali8/bundle?product_id=" + encodeURIComponent(productId),
      { headers: { Accept: "application/json" } },
    )
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        return (data && data.bundle) || null;
      });
  }

  function addBundleToCart(bundle) {
    var items = bundle.items.map(function (item) {
      return {
        id: item.variantId,
        quantity: item.quantity,
        properties: { _quali8_bundle: String(bundle.id) },
      };
    });

    return fetch(ROOT + "cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ items: items }),
    }).then(function (r) {
      if (!r.ok) {
        return r
          .json()
          .catch(function () {
            return {};
          })
          .then(function (body) {
            throw new Error(body.description || body.message || "Cart error");
          });
      }
      return r.json();
    });
  }

  function renderItems(container, bundle, currency) {
    var thumbs = el("div", "q8-fbt__thumbs");
    bundle.items.forEach(function (item, index) {
      if (index > 0) thumbs.appendChild(el("span", "q8-fbt__plus", "+"));

      var figure = el("figure", "q8-fbt__thumb");
      if (item.imageUrl) {
        var img = document.createElement("img");
        img.src = item.imageUrl;
        img.alt = item.productTitle;
        img.loading = "lazy";
        img.width = 72;
        img.height = 72;
        figure.appendChild(img);
      } else {
        figure.appendChild(el("span", "q8-fbt__thumb-placeholder", "🛍"));
      }
      if (item.quantity > 1) {
        figure.appendChild(el("span", "q8-fbt__qty", "×" + item.quantity));
      }
      thumbs.appendChild(figure);
    });
    container.appendChild(thumbs);

    var list = el("ul", "q8-fbt__list");
    bundle.items.forEach(function (item) {
      var line = el("li", "q8-fbt__line");
      var label = item.productTitle;
      if (item.variantTitle) label += " — " + item.variantTitle;
      if (item.quantity > 1) label += " × " + item.quantity;
      line.appendChild(el("span", "q8-fbt__line-title", label));

      var price = el("span", "q8-fbt__line-price");
      var hasItemDiscount =
        typeof item.discountedPrice === "number" &&
        item.discountedPrice < item.price;
      if (hasItemDiscount) {
        price.appendChild(
          el(
            "s",
            "q8-fbt__line-original",
            formatMoney(item.price * item.quantity, currency),
          ),
        );
        price.appendChild(document.createTextNode(" "));
        price.appendChild(
          el(
            "span",
            null,
            formatMoney(item.discountedPrice * item.quantity, currency),
          ),
        );
      } else {
        price.textContent = formatMoney(item.price * item.quantity, currency);
      }
      line.appendChild(price);
      list.appendChild(line);
    });
    container.appendChild(list);
  }

  function renderSummary(container, bundle, currency, settings) {
    var summary = el("div", "q8-fbt__summary");

    var prices = el("div", "q8-fbt__prices");
    prices.appendChild(
      el(
        "s",
        "q8-fbt__original",
        formatMoney(bundle.pricing.originalTotal, currency),
      ),
    );
    prices.appendChild(
      el("span", "q8-fbt__final", formatMoney(bundle.pricing.finalTotal, currency)),
    );
    summary.appendChild(prices);

    if (settings.showSavings && bundle.pricing.savingsPercent > 0) {
      summary.appendChild(
        el(
          "span",
          "q8-fbt__badge",
          "Save " +
            formatMoney(bundle.pricing.discountAmount, currency) +
            " (" +
            bundle.pricing.savingsPercent +
            "%)",
        ),
      );
    }

    container.appendChild(summary);
  }

  function render(block, bundle) {
    var currency = block.dataset.currency || "USD";
    var settings = {
      heading: block.dataset.heading || bundle.title,
      buttonLabel: block.dataset.buttonLabel || "Add bundle to cart",
      addedLabel: block.dataset.addedLabel || "Added to cart ✓",
      errorMessage:
        block.dataset.errorMessage || "Couldn't add the bundle. Please try again.",
      afterAdd: block.dataset.afterAdd || "stay",
      showSavings: block.dataset.showSavings !== "false",
    };

    var card = el("div", "q8-fbt__card");
    card.appendChild(el("h3", "q8-fbt__heading", settings.heading));
    if (bundle.description) {
      card.appendChild(el("p", "q8-fbt__description", bundle.description));
    }

    renderItems(card, bundle, currency);
    renderSummary(card, bundle, currency, settings);

    var button = el("button", "q8-fbt__button", settings.buttonLabel);
    button.type = "button";
    card.appendChild(button);

    var error = el("p", "q8-fbt__error", settings.errorMessage);
    error.hidden = true;
    card.appendChild(error);

    // Duplicate prevention: ignore clicks while a request is in flight or
    // right after a successful add.
    var busy = false;
    button.addEventListener("click", function () {
      if (busy) return;
      busy = true;
      error.hidden = true;
      button.disabled = true;
      button.classList.add("q8-fbt__button--loading");

      addBundleToCart(bundle)
        .then(function () {
          button.classList.remove("q8-fbt__button--loading");
          button.textContent = settings.addedLabel;
          document.dispatchEvent(new CustomEvent("cart:updated"));

          if (settings.afterAdd === "cart") {
            window.location.href = ROOT + "cart";
            return;
          }
          // Let the shopper add the bundle again after a moment.
          setTimeout(function () {
            button.textContent = settings.buttonLabel;
            button.disabled = false;
            busy = false;
          }, 2000);
        })
        .catch(function (err) {
          // Shopper sees the merchant-configured message; the real reason
          // (e.g. "sold out", product not published to the Online Store)
          // goes to the console for the merchant/developer.
          console.error("[quali8 bundle] cart add failed:", err);
          button.classList.remove("q8-fbt__button--loading");
          button.textContent = settings.buttonLabel;
          button.disabled = false;
          error.hidden = false;
          busy = false;
        });
    });

    block.textContent = "";
    block.appendChild(card);
    block.hidden = false;
  }

  blocks.forEach(function (block) {
    // Guard against double init (theme editor re-renders, duplicate script tags).
    if (block.dataset.q8Init) return;
    block.dataset.q8Init = "1";

    var productId = block.dataset.productId;
    if (!productId) return;

    fetchBundle(productId)
      .then(function (bundle) {
        if (bundle && bundle.items && bundle.items.length) {
          render(block, bundle);
        }
        // No bundle → block simply stays hidden.
      })
      .catch(function () {
        // Errors render nothing — never break the product page.
      });
  });
})();
