/**
 * YouTube Short Blocker — content script
 *
 * Hides `ytm-rich-section-renderer` (and related Shorts shelves) on
 * youtube.com / m.youtube.com, including after SPA navigation and
 * dynamic DOM re-injection.
 */
(function () {
  "use strict";

  const TARGET_SELECTORS = [
    "ytm-rich-section-renderer",
    "ytd-rich-shelf-renderer[is-shorts]",
    "ytd-reel-shelf-renderer",
  ];

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
  }

  function scanSubtree(node) {
    hideMatchingIn(node);
    if (!node || !node.querySelectorAll) return;

    // Catch nodes that appear inside added subtrees before attributes settle.
    node.querySelectorAll("*").forEach((el) => {
      if (matchesTarget(el)) hideNode(el);
    });
  }

  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    const run = () => {
      scheduled = false;
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
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          scanSubtree(node);
        });
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
      attributes: true,
      attributeFilter: ["is-shorts", "class", "style"],
    });
    return observer;
  }

  // YouTube fires these on SPA navigations (desktop polymer + mobile).
  function onYouTubeNavigate() {
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

  // Fallback for history-based SPA transitions.
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  if (typeof pushState === "function") {
    history.pushState = function () {
      const result = pushState.apply(this, arguments);
      scheduleScan();
      return result;
    };
  }
  if (typeof replaceState === "function") {
    history.replaceState = function () {
      const result = replaceState.apply(this, arguments);
      scheduleScan();
      return result;
    };
  }
  window.addEventListener("popstate", scheduleScan, true);

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
