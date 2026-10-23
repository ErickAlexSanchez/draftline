import { LOCALE_KEY, THEME_KEY } from "./i18n";

export const PREFS_BOOT = `(function () {
  var root = document.documentElement;
  var theme = null;
  var locale = null;
  try {
    theme = localStorage.getItem(${JSON.stringify(THEME_KEY)});
    locale = localStorage.getItem(${JSON.stringify(LOCALE_KEY)});
  } catch (error) {
    theme = null;
    locale = null;
  }
  if (theme !== "light" && theme !== "dark") {
    var dark = false;
    try {
      dark = window.matchMedia("(prefers-color-scheme: dark)").matches === true;
    } catch (error) {
      dark = false;
    }
    theme = dark ? "dark" : "light";
  }
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  if (locale === "en" || locale === "es") root.lang = locale;
})();`;
