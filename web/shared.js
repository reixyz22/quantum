// Which commit the deployed site was built from. Written by tools/build_site.mjs.
// Makes "did production actually update?" a thing you can read off the page.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const slot = document.getElementById("build-stamp");
    if (!slot) return;

    fetch("build-info.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => {
        if (!info) return;
        const when = new Date(info.builtAt).toLocaleString();
        slot.textContent = "build " + info.commit + " · " + when;
      })
      .catch(() => {
        /* opened straight off disk, so there's no build to stamp. fine. */
      });
  });
})();


// Theme toggle. Runs before paint (this script is in <head>) so there's no
// white flash before a dark page settles. Dark is the default.
(function () {
  const KEY = "q-theme";
  let theme = "dark";
  try { theme = localStorage.getItem(KEY) || "dark"; } catch { /* private mode */ }

  function apply(next) {
    theme = next;
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.textContent = next === "dark" ? "☀" : "☾";
      btn.setAttribute("aria-label", next === "dark" ? "Switch to light" : "Switch to dark");
    });
  }

  apply(theme);

  document.addEventListener("DOMContentLoaded", () => {
    apply(theme);  // label the buttons now that they exist
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => apply(theme === "dark" ? "light" : "dark"));
    });
  });
})();


// Text-size controls shared by every page. Remembered per device.
(function () {
  const KEY = "q-font-size";
  const MIN = 14, MAX = 34, STEP = 2;

  function read() {
    try { return parseInt(localStorage.getItem(KEY), 10) || 17; } catch { return 17; }
  }
  function apply(px) {
    document.documentElement.style.setProperty("--font-size", px + "px");
    try { localStorage.setItem(KEY, String(px)); } catch { /* private mode */ }
  }

  let size = read();
  apply(size);

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        size = Math.min(MAX, Math.max(MIN, size + STEP * Number(btn.dataset.size)));
        apply(size);
      });
    });
  });
})();
