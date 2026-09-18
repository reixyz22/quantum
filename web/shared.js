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
