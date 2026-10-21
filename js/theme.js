/* ShowLink — automatic day/night theme (WIB / Asia-Jakarta)
   Default: light 06:00–17:59, dark 18:00–05:59.
   Manual Light/Dark remains available until Auto is selected. */
(() => {
  "use strict";
  const KEY = "showlink-theme";
  const zone = "Asia/Jakarta";
  function hourWIB() {
    try {
      return Number(new Intl.DateTimeFormat("en-GB", {
        timeZone: zone, hour: "2-digit", hourCycle: "h23"
      }).format(new Date()));
    } catch (_) {
      return new Date().getHours();
    }
  }
  function mode() {
    try {
      const saved = localStorage.getItem(KEY);
      return saved === "light" || saved === "dark" ? saved : "auto";
    } catch (_) { return "auto"; }
  }
  function resolve(value) {
    if (value === "light" || value === "dark") return value;
    const hour = hourWIB();
    return hour >= 6 && hour < 18 ? "light" : "dark";
  }
  function apply(value, persist = false) {
    const selected = value === "light" || value === "dark" ? value : "auto";
    const theme = resolve(selected);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (persist) {
      try {
        if (selected === "auto") localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, selected);
      } catch (_) {}
    }
    document.querySelectorAll("[data-theme-mode]").forEach(button => {
      button.classList.toggle("is-selected", button.dataset.themeMode === selected);
      button.setAttribute("aria-pressed", String(button.dataset.themeMode === selected));
    });
    document.querySelectorAll("[data-setting-theme]").forEach(button => {
      button.classList.toggle("is-selected", button.dataset.settingTheme === selected);
      button.setAttribute("aria-pressed", String(button.dataset.settingTheme === selected));
    });
    window.dispatchEvent(new CustomEvent("showlink:theme-change", { detail: { theme, mode: selected } }));
    return theme;
  }
  function refresh() { return apply(mode(), false); }
  window.ShowLinkTheme = { getTheme: () => resolve(mode()), getMode: mode, applyTheme: apply, refresh, automaticTheme: () => resolve("auto") };
  try { refresh(); } catch (_) {}
  document.addEventListener("DOMContentLoaded", () => {
    refresh();
    document.querySelectorAll("[data-theme-mode]").forEach(button => {
      button.addEventListener("click", () => apply(button.dataset.themeMode, true));
    });
    // Re-check the clock periodically, so an open page changes theme at day/night transition.
    window.setInterval(() => { if (mode() === "auto") refresh(); }, 60000);
  });
  window.addEventListener("storage", event => { if (event.key === KEY) refresh(); });
})();