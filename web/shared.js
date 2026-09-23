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
    try { return parseInt(localStorage.getItem(KEY), 10) || 20; } catch { return 20; }
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
