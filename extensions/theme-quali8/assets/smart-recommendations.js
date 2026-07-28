/*
 * Quali8 — Smart Recommendations.
 *
 * Fetches occasion/recipient/budget-aware product picks from the app proxy
 * and renders a picker (chips + occasion select) plus product cards with an
 * explanation chip ("Perfect for Mother's Day"). Selections persist in
 * sessionStorage so the cart block continues where the product page left
 * off. All DOM is built with createElement/textContent — never innerHTML
 * with remote data.
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
    return fetch(ROOT + "cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        items: [{ id: Number(numericId(variantGid)), quantity: 1 }],
      }),
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function chipRow(labelText, options, selectedSlug, onPick) {
    var row = el("div", "q8-recs__chips");
    row.appendChild(el("span", "q8-recs__chips-label", labelText));
    options.forEach(function (option) {
      var chip = el("button", "q8-recs__chip", option.label);
      chip.type = "button";
      if (option.slug === selectedSlug) {
        chip.classList.add("q8-recs__chip--active");
      }
      chip.addEventListener("click", function () {
        onPick(option.slug === selectedSlug ? null : option.slug);
      });
      row.appendChild(chip);
    });
    return row;
  }

  function render(block, data, selection) {
    block.textContent = "";

    if (!data.products.length && !selection.touched) {
      // Nothing to show and the shopper hasn't interacted — stay hidden.
      block.hidden = true;
      return;
    }
    block.hidden = false;

    var heading = block.dataset.heading;
    if (heading) block.appendChild(el("h2", "q8-recs__heading", heading));

    if (block.dataset.showPicker === "true") {
      var picker = el("div", "q8-recs__picker");

      if (data.occasions.length) {
        var occasionWrap = el("div", "q8-recs__chips");
        occasionWrap.appendChild(
          el("span", "q8-recs__chips-label", "Occasion"),
        );
        var select = document.createElement("select");
        select.className = "q8-recs__select";
        var anyOption = document.createElement("option");
        anyOption.value = "";
        anyOption.textContent = "Any occasion";
        select.appendChild(anyOption);
        data.occasions.forEach(function (occasion) {
          var option = document.createElement("option");
          option.value = occasion.slug;
          option.textContent =
            occasion.name + (occasion.inSeason ? " · now" : "");
          if (occasion.slug === selection.occasion) option.selected = true;
          select.appendChild(option);
        });
        select.addEventListener("change", function () {
          update(block, { occasion: select.value || null });
        });
        occasionWrap.appendChild(select);
        picker.appendChild(occasionWrap);
      }

      picker.appendChild(
        chipRow("Recipient", data.recipients, selection.recipient, function (slug) {
          update(block, { recipient: slug });
        }),
      );
      picker.appendChild(
        chipRow("Budget", data.budgets, selection.budget, function (slug) {
          update(block, { budget: slug });
        }),
      );
      block.appendChild(picker);
    }

    if (!data.products.length) {
      block.appendChild(
        el(
          "p",
          "q8-recs__empty",
          "No matches for these filters yet — try a different budget or occasion.",
        ),
      );
      return;
    }

    var grid = el("div", "q8-recs__grid");
    data.products.forEach(function (product) {
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
          addToCart(product.variantId)
            .then(function () {
              button.textContent = block.dataset.addedLabel || "Added ✓";
              if (block.dataset.context === "cart") {
                window.location.reload();
              }
            })
            .catch(function () {
              button.disabled = false;
            });
        });
        card.appendChild(button);
      }

      grid.appendChild(card);
    });
    block.appendChild(grid);
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
