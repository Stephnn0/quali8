/*
 * Quali8 — Gift notes & messages.
 *
 * Renders the merchant-configured fields and saves them to the cart as the
 * shopper types (debounced) with POST /cart/update.js: cart attributes for
 * every field, or the cart note for "special instructions" when configured
 * that way. Attributes and the note ride along to the order, where they
 * show as "Additional details" and the order note. Existing values are
 * pre-filled from the cart so edits round-trip. All DOM is built with
 * createElement/textContent.
 */
(function () {
  var ROOT =
    (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
    "/";
  var SAVE_DELAY = 650;

  var blocks = document.querySelectorAll("[data-quali8-notes]");
  if (!blocks.length) return;

  function readJson(block, selector) {
    var node = block.querySelector(selector);
    try {
      return JSON.parse((node && node.textContent) || "null");
    } catch (e) {
      return null;
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function isoDay(date) {
    return date.toISOString().slice(0, 10);
  }

  function slugId(prefix, label, index) {
    return (
      prefix +
      "-" +
      String(label || "field")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      index
    );
  }

  // --- Saving ----------------------------------------------------------------

  function saveCart(payload) {
    return fetch(ROOT + "cart/update.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }

  function init(block) {
    var settings = readJson(block, "[data-q8-notes-settings]") || {};
    var existing = readJson(block, "[data-q8-notes-attributes]") || {};
    var existingNote = block.dataset.cartNote || "";
    var fields = (settings.fields || []).filter(function (field) {
      return field.enabled && field.label;
    });
    if (!fields.length) return;

    var state = { attributes: {}, note: null, noteEnabled: false };
    var status = el("span", "q8-notes__status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.hidden = true;

    var timer = null;
    var inflight = false;
    var queued = false;

    function setStatus(kind, text) {
      status.className = "q8-notes__status q8-notes__status--" + kind;
      status.textContent = text;
      status.hidden = !text;
    }

    function flush() {
      if (inflight) {
        queued = true;
        return;
      }
      inflight = true;
      setStatus("saving", settings.savingLabel || "Saving…");

      var payload = { attributes: state.attributes };
      if (state.noteEnabled) payload.note = state.note || "";

      saveCart(payload)
        .then(function (cart) {
          setStatus("saved", settings.savedLabel || "Saved");
          try {
            document.dispatchEvent(
              new CustomEvent("cart:refresh", { bubbles: true, detail: cart }),
            );
          } catch (e) {
            /* nothing to announce to */
          }
        })
        .catch(function (error) {
          setStatus("error", settings.errorLabel || "Couldn't save.");
          if (window.console && console.error) {
            console.error("Quali8 gift notes save failed:", error);
          }
        })
        .then(function () {
          inflight = false;
          if (queued) {
            queued = false;
            flush();
          }
        });
    }

    function scheduleSave() {
      clearTimeout(timer);
      setStatus("pending", "");
      timer = setTimeout(flush, SAVE_DELAY);
    }

    // --- Build ---------------------------------------------------------------

    var header = el("div", "q8-notes__header");
    var titles = el("div", "q8-notes__titles");
    if (settings.heading) {
      titles.appendChild(el("h2", "q8-notes__heading", settings.heading));
    }
    if (settings.description) {
      titles.appendChild(el("p", "q8-notes__description", settings.description));
    }
    header.appendChild(titles);
    header.appendChild(status);
    block.appendChild(header);

    var form = el("div", "q8-notes__fields");

    fields.forEach(function (field, index) {
      var id = slugId("q8-notes", field.label, index);
      var attribute = field.attribute || field.label;
      var usesNote = field.kind === "textarea" && field.target === "note";
      var initial = usesNote ? existingNote : existing[attribute] || "";

      if (usesNote) {
        state.noteEnabled = true;
        state.note = initial;
      } else {
        state.attributes[attribute] = initial;
      }

      var wrap = el("div", "q8-notes__field q8-notes__field--" + field.kind);

      if (field.kind === "toggle") {
        var onValue = field.value || "Yes";
        var label = el("label", "q8-notes__switch");
        label.htmlFor = id;
        var input = document.createElement("input");
        input.type = "checkbox";
        input.id = id;
        input.className = "q8-notes__switch-input";
        input.checked = initial === onValue;
        var track = el("span", "q8-notes__switch-track");
        track.appendChild(el("span", "q8-notes__switch-thumb"));
        label.appendChild(input);
        label.appendChild(track);
        label.appendChild(el("span", "q8-notes__switch-label", field.label));
        input.addEventListener("change", function () {
          state.attributes[attribute] = input.checked ? onValue : "";
          scheduleSave();
        });
        wrap.appendChild(label);
        form.appendChild(wrap);
        return;
      }

      var labelRow = el("div", "q8-notes__label-row");
      var labelEl = el("label", "q8-notes__label", field.label);
      labelEl.htmlFor = id;
      labelRow.appendChild(labelEl);

      var control;
      if (field.kind === "textarea") {
        control = document.createElement("textarea");
        control.rows = 3;
      } else {
        control = document.createElement("input");
        control.type = field.kind === "date" ? "date" : "text";
      }
      control.id = id;
      control.className = "q8-notes__input";
      control.value = initial;
      if (field.placeholder) control.placeholder = field.placeholder;
      control.setAttribute("autocomplete", "off");

      var counter = null;
      if (field.maxLength && field.kind !== "date") {
        control.maxLength = field.maxLength;
        counter = el("span", "q8-notes__counter");
        var updateCounter = function () {
          counter.textContent = control.value.length + " / " + field.maxLength;
        };
        updateCounter();
        control.addEventListener("input", updateCounter);
        labelRow.appendChild(counter);
      }

      if (field.kind === "date") {
        var min = new Date();
        min.setDate(min.getDate() + (Number(field.minDays) || 0));
        control.min = isoDay(min);
      }

      control.addEventListener("input", function () {
        if (usesNote) state.note = control.value;
        else state.attributes[attribute] = control.value;
        scheduleSave();
      });
      if (field.kind === "date") {
        control.addEventListener("change", function () {
          state.attributes[attribute] = control.value;
          scheduleSave();
        });
      }

      wrap.appendChild(labelRow);
      wrap.appendChild(control);
      form.appendChild(wrap);
    });

    block.appendChild(form);
  }

  blocks.forEach(init);
})();
