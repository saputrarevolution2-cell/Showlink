(() => {
  "use strict";
  try {
    const saved = localStorage.getItem("showlink-theme");
    const dark = saved === "dark" || (saved !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const theme = saved === "dark" || saved === "light" ? saved : (dark ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();
