/**
 * YouTube Short Blocker — content script
 *
 * Hides Shorts UI (rich sections, shelves, guide entry, mobile pivot tab)
 * and redirects /shorts/ URLs to the site home on youtube.com / m.youtube.com,
 * including after SPA navigation and dynamic DOM re-injection.
 */
(function () {
  "use strict";

  const TARGET_SELECTORS = [
    "ytm-rich-section-renderer",
    "ytd-rich-shelf-renderer[is-shorts]",
    "ytd-reel-shelf-renderer",
  ];

  const SHORTS_LABEL = "Shorts";
  const HIDDEN_CLASS = "ysb-hidden-shorts";
  const HIDDEN_ATTR = "data-ysb-hidden";

  function hideNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.getAttribute(HIDDEN_ATTR) === "1") return;

    node.classList.add(HIDDEN_CLASS);
    node.setAttribute(HIDDEN_ATTR, "1");
    node.style.setProperty("display", "none", "important");
    node.style.setProperty("visibility", "hidden", "important");
    node.style.setProperty("height", "0", "important");
    node.style.setProperty("max-height", "0", "important");
    node.style.setProperty("overflow", "hidden", "important");
    node.style.setProperty("margin", "0", "important");
    node.style.setProperty("padding", "0", "important");
    node.style.setProperty("pointer-events", "none", "important");
  }

  function matchesTarget(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = el.tagName && el.tagName.toLowerCase();
    if (tag === "ytm-rich-section-renderer") return true;
    if (tag === "ytd-reel-shelf-renderer") return true;
    if (tag === "ytd-rich-shelf-renderer" && el.hasAttribute("is-shorts")) {
      return true;
    }
    return false;
  }

  function isShortsFormattedString(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = el.tagName && el.tagName.toLowerCase();
    if (tag !== "yt-formatted-string") return false;
    return (el.textContent || "").trim() === SHORTS_LABEL;
  }

  function hideGuideEntryForLabel(el) {
    if (!isShortsFormattedString(el)) return;
    const entry = el.closest && el.closest("ytd-guide-entry-renderer");
    if (entry) hideNode(entry);
  }

  function hideGuideShortsEntries(root) {
    if (!root) return;

    if (isShortsFormattedString(root)) {
      hideGuideEntryForLabel(root);
    }

    if (!root.querySelectorAll) return;
    root.querySelectorAll("yt-formatted-string").forEach(hideGuideEntryForLabel);
  }

  function isShortsSpan(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = el.tagName && el.tagName.toLowerCase();
    if (tag !== "span") return false;
    return (el.textContent || "").trim() === SHORTS_LABEL;
  }

  function hidePivotItemForSpan(el) {
    if (!isShortsSpan(el)) return;
    const item = el.closest && el.closest("ytm-pivot-bar-item-renderer");
    if (item) hideNode(item);
  }

  function hidePivotShortsItems(root) {
    if (!root) return;

    if (isShortsSpan(root)) {
      hidePivotItemForSpan(root);
    }

    if (!root.querySelectorAll) return;
    root
      .querySelectorAll("ytm-pivot-bar-item-renderer span")
      .forEach(hidePivotItemForSpan);
  }

  function hideMatchingIn(root) {
    if (!root || !root.querySelectorAll) return;

    for (const selector of TARGET_SELECTORS) {
      try {
        root.querySelectorAll(selector).forEach(hideNode);
      } catch (_) {
        /* ignore invalid selector in older engines */
      }
    }

    if (matchesTarget(root)) {
      hideNode(root);
    }

    hideGuideShortsEntries(root);
    hidePivotShortsItems(root);
  }

  function scanSubtree(node) {
    hideMatchingIn(node);
    if (!node || !node.querySelectorAll) return;

    // Catch nodes that appear inside added subtrees before attributes settle.
    node.querySelectorAll("*").forEach((el) => {
      if (matchesTarget(el)) hideNode(el);
      if (isShortsFormattedString(el)) hideGuideEntryForLabel(el);
      if (isShortsSpan(el)) hidePivotItemForSpan(el);
    });
  }

  function elementFromTextTarget(target) {
    if (!target) return null;
    if (target.nodeType === Node.TEXT_NODE) {
      return target.parentElement;
    }
    return target.nodeType === Node.ELEMENT_NODE ? target : null;
  }

  function handleLabelMutationTarget(target) {
    const el = elementFromTextTarget(target);
    hideGuideEntryForLabel(el);
    hidePivotItemForSpan(el);
  }

  /* ---- /shorts/ redirect (full load + SPA) ---- */

  function isShortsPath(pathname) {
    return /^\/shorts(?:\/|$)/i.test(pathname || "");
  }

  function homeUrlFor(url) {
    return url.origin + "/";
  }

  function maybeRedirectShorts() {
    try {
      if (!isShortsPath(location.pathname)) return false;
      const home = homeUrlFor(location);
      if (location.href === home) return false;
      location.replace(home);
      return true;
    } catch (_) {
      return false;
    }
  }

  function urlLooksLikeShorts(url) {
    if (url == null || url === "") return false;
    try {
      return isShortsPath(new URL(String(url), location.href).pathname);
    } catch (_) {
      return false;
    }
  }

  function redirectUrlToHome(url) {
    try {
      const next = new URL(String(url), location.href);
      return homeUrlFor(next);
    } catch (_) {
      return location.origin + "/";
    }
  }

  // Full page load / early document_start.
  if (maybeRedirectShorts()) {
    return;
  }

  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    const run = () => {
      scheduled = false;
      if (maybeRedirectShorts()) return;
      hideMatchingIn(document);
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 0);
    }
  }

  function onMutations(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            handleLabelMutationTarget(node);
            return;
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          scanSubtree(node);
        });
        // Text replacements inside existing guide / pivot labels.
        if (mutation.target && mutation.target.nodeType === Node.ELEMENT_NODE) {
          handleLabelMutationTarget(mutation.target);
          const tag =
            mutation.target.tagName && mutation.target.tagName.toLowerCase();
          if (tag !== "yt-formatted-string" && tag !== "span") {
            hideGuideShortsEntries(mutation.target);
            hidePivotShortsItems(mutation.target);
          }
        }
      } else if (mutation.type === "characterData") {
        handleLabelMutationTarget(mutation.target);
      } else if (mutation.type === "attributes") {
        if (matchesTarget(mutation.target)) {
          hideNode(mutation.target);
        }
      }
    }
  }

  function startObserver() {
    const root = document.documentElement || document;
    const observer = new MutationObserver(onMutations);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["is-shorts", "class", "style"],
    });
    return observer;
  }

  // YouTube fires these on SPA navigations (desktop polymer + mobile).
  function onYouTubeNavigate() {
    if (maybeRedirectShorts()) return;
    scheduleScan();
  }

  [
    "yt-navigate-start",
    "yt-navigate-finish",
    "yt-page-data-updated",
    "yt-page-type-changed",
  ].forEach((eventName) => {
    document.addEventListener(eventName, onYouTubeNavigate, true);
    window.addEventListener(eventName, onYouTubeNavigate, true);
  });

  // Fallback for history-based SPA transitions (including into /shorts/).
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  if (typeof pushState === "function") {
    history.pushState = function (state, title, url) {
      if (urlLooksLikeShorts(url)) {
        location.replace(redirectUrlToHome(url));
        return;
      }
      const result = pushState.apply(this, arguments);
      if (maybeRedirectShorts()) return result;
      scheduleScan();
      return result;
    };
  }
  if (typeof replaceState === "function") {
    history.replaceState = function (state, title, url) {
      if (urlLooksLikeShorts(url)) {
        location.replace(redirectUrlToHome(url));
        return;
      }
      const result = replaceState.apply(this, arguments);
      if (maybeRedirectShorts()) return result;
      scheduleScan();
      return result;
    };
  }
  window.addEventListener(
    "popstate",
    function () {
      if (maybeRedirectShorts()) return;
      scheduleScan();
    },
    true
  );

  // Initial pass + observer. document_start may run before body exists.
  hideMatchingIn(document);
  startObserver();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleScan, { once: true });
  } else {
    scheduleScan();
  }

  // Periodic light rescan to catch late Polymer / Lit renders.
  let ticks = 0;
  const intervalId = setInterval(() => {
    scheduleScan();
    ticks += 1;
    if (ticks >= 20) clearInterval(intervalId);
  }, 500);
})();
