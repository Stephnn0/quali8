/*
 * Quali8 — Shipping progress bar.
 *
 * Fetches the current shopper's eligible shipping offers from the app proxy,
 * reads the live cart via the Ajax API, and renders a progress bar that updates
 * whenever the cart changes. All money math is done in cents (the unit cart.js
 * reports); offer thresholds arrive in major units and are converted here.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";

  var el = document.getElementById("quali8-shipping-bar");
  if (!el) return;

  var messageEl = el.querySelector(".quali8-shipping-bar__message");
  var fillEl = el.querySelector(".quali8-shipping-bar__fill");

  var progressTemplate =
    el.dataset.progressMessage || "Spend [amount] more to unlock [reward]!";
  var successTemplate =
    el.dataset.successMessage || "🎉 You've unlocked [reward]!";

  // Sorted ascending by threshold (major units). Loaded once on page load.
  var offers = null;

  function formatMoney(cents, currency) {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || "en", {
        style: "currency",
        currency: currency || "USD",
      }).format(cents / 100);
    } catch (e) {
      return "$" + (cents / 100).toFixed(2);
    }
  }

  function rewardPhrase(offer, currency) {
    if (offer.rewardType === "free_shipping") return "free shipping";
    if (offer.rewardType === "percentage_off")
      return offer.value + "% off shipping";
    // amount_off: value is in major units, so render it as money directly.
    return formatMoney(offer.value * 100, currency) + " off shipping";
  }

  function fillTemplate(template, replacements) {
    return template.replace(/\[(\w+)\]/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(replacements, key)
        ? replacements[key]
        : match;
    });
  }

  function render(cart) {
    if (!offers || !offers.length) {
      el.hidden = true;
      return;
    }

    // Align with the Shopify Function, which checks cart subtotal.
    var subtotalCents = cart.total_price;
    var currency = cart.currency || "USD";

    // The nearest not-yet-reached tier, or the highest tier if all are met.
    var next = null;
    for (var i = 0; i < offers.length; i++) {
      if (subtotalCents < Math.round(offers[i].threshold * 100)) {
        next = offers[i];
        break;
      }
    }
    var active = next || offers[offers.length - 1];
    var thresholdCents = Math.round(active.threshold * 100);
    var reward = rewardPhrase(active, currency);

    if (next) {
      var remaining = thresholdCents - subtotalCents;
      var pct = Math.max(0, Math.min(100, (subtotalCents / thresholdCents) * 100));
      messageEl.innerHTML = fillTemplate(progressTemplate, {
        amount: "<strong>" + formatMoney(remaining, currency) + "</strong>",
        reward: reward,
      });
      fillEl.style.width = pct + "%";
    } else {
      messageEl.innerHTML = fillTemplate(successTemplate, { reward: reward });
      fillEl.style.width = "100%";
    }

    el.hidden = false;
  }

  function getCart() {
    return fetch(ROOT + "cart.js", {
      headers: { Accept: "application/json" },
    }).then(function (r) {
      return r.json();
    });
  }

  function getOffers() {
    return fetch(ROOT + "apps/quali8/free-shipping", {
      headers: { Accept: "application/json" },
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        return (data && data.offers) || [];
      })
      .catch(function () {
        return [];
      });
  }

  function refresh() {
    getCart().then(render).catch(function () {});
  }

  // Themes have no universal "cart changed" event, so detect cart mutations by
  // wrapping fetch + XHR (the Ajax API endpoints) and re-reading the cart.
  function watchCart() {
    var CART_CHANGE = /\/cart\/(add|change|update|clear)(\.js)?/;

    if (window.fetch) {
      var origFetch = window.fetch;
      window.fetch = function () {
        var args = arguments;
        return origFetch.apply(this, args).then(function (res) {
          try {
            var input = args[0];
            var url = input && input.url ? input.url : input;
            if (typeof url === "string" && CART_CHANGE.test(url)) {
              setTimeout(refresh, 0);
            }
          } catch (e) {
            /* ignore */
          }
          return res;
        });
      };
    }

    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        if (typeof url === "string" && CART_CHANGE.test(url)) {
          this.addEventListener("load", function () {
            setTimeout(refresh, 0);
          });
        }
      } catch (e) {
        /* ignore */
      }
      return origOpen.apply(this, arguments);
    };

    // Honour explicit theme broadcasts where available.
    document.addEventListener("cart:updated", refresh);
    document.addEventListener("cart:refresh", refresh);
  }

  getOffers().then(function (loaded) {
    offers = loaded;
    if (!offers.length) {
      el.hidden = true;
      return;
    }
    watchCart();
    refresh();
  });
})();
