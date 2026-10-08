# YouTube Short Blocker

Cross-browser extension that hides YouTube Shorts UI on **youtube.com** and **m.youtube.com**, including after client-side (SPA) navigation.

**Primary target:** `ytm-rich-section-renderer`  
**Also hides (desktop Shorts shelves):** `ytd-rich-shelf-renderer[is-shorts]`, `ytd-reel-shelf-renderer`  
**Also hides (sidebar guide):** parent `ytd-guide-entry-renderer` when a child `yt-formatted-string` has trimmed text exactly `Shorts`

| Browser | Support |
|---------|---------|
| Chrome / Chromium / Edge / Brave / Opera | Manifest V3 (load unpacked) |
| Firefox | Manifest V3 (temporary or permanent add-on) |
| Safari (macOS) | Convert with Xcode → Safari Web Extension |
| Safari (iOS / iPadOS) | Same Xcode wrapper; enable under Safari → Extensions |

**Permissions:** host access only for `youtube.com`, `www.youtube.com`, and `m.youtube.com`. No storage, tabs, or broader `<all_urls>` access.

---

## How it works

1. A content script and stylesheet inject at `document_start` on matching YouTube hosts.
2. CSS forces matching Shorts / rich-section nodes to stay hidden.
3. The script also finds `yt-formatted-string` labels whose trimmed text is exactly `Shorts` and hides the parent `ytd-guide-entry-renderer`.
4. A `MutationObserver` plus YouTube navigation events (`yt-navigate-finish`, history hooks) re-hide nodes if the SPA re-injects them.

---

## Install

### Chrome / Chromium / Edge / Brave / Opera

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`, etc.).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this repository’s root folder (the one that contains `manifest.json`).
5. Open [youtube.com](https://www.youtube.com) or [m.youtube.com](https://m.youtube.com) and confirm Shorts rich sections are hidden.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `manifest.json` from this repository root.
4. Visit YouTube; the extension runs until Firefox is restarted.

For a lasting install during development, use [`web-ext`](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/):

```bash
npx web-ext run --source-dir .
# or package:
npx web-ext build --source-dir .
```

Then load the built `.zip` via `about:addons` → gear → **Install Add-on From File…** (signed/self-distributed builds follow Mozilla’s usual rules for permanent install).

### Safari (desktop, macOS)

Safari cannot load this folder as an unpacked extension. Convert it on a Mac with Xcode:

```bash
xcrun safari-web-extension-converter . \
  --project-location ./safari/YouTubeShortBlocker \
  --app-name "YouTube Short Blocker" \
  --bundle-identifier com.example.youtube-short-blocker \
  --swift \
  --force
```

1. Open the generated Xcode project.
2. Set your signing **Team**.
3. Run on **My Mac**.
4. Safari → Settings → **Extensions** → enable **YouTube Short Blocker**.
5. Allow YouTube site access when prompted.

Full notes: [safari/README.md](safari/README.md).

### Safari for iPhone / iPad

1. On a Mac, convert and open the Xcode project as above.
2. Select an iOS Simulator or a physical device as the run destination and build/run.
3. On the device/simulator: **Settings → Apps → Safari → Extensions** (wording varies by iOS version) and enable **YouTube Short Blocker**.
4. Allow it for YouTube, then open Safari to `m.youtube.com` or `youtube.com`.

**Requires your Mac + Xcode + Apple Developer signing.** This repo ships the shared WebExtension sources and conversion instructions; it does not include a pre-built signed `.ipa` / App Store package.

---

## Packaged builds (GitHub Actions)

On every push / pull request (and when you run the workflow manually), CI packs installable zips:

| Artifact | Use with |
|----------|----------|
| `youtube-short-blocker-chromium-v*.zip` | Chrome, Edge, Brave, Opera, other Chromium browsers |
| `youtube-short-blocker-firefox-v*.zip` | Firefox (`about:addons` → Install Add-on From File, or temporary load) |

1. Open the [Actions](../../actions) tab → workflow **Pack extension**.
2. Open the latest successful run → **Artifacts**.
3. Download the zip for your browser.

### Attach zips to a GitHub Release

Branch pushes and pull requests only upload **Actions artifacts**. Release assets are attached when the workflow runs on a **version tag** (or a published GitHub Release for that tag):

```bash
# from main, after the version in manifest.json is correct
git tag v1.0.1
git push origin v1.0.1
```

That creates/updates the GitHub Release for `v1.0.1` and uploads both zip files. You can also publish a Release in the GitHub UI for a `v*` tag — the same attach step runs.

Safari still needs the Xcode conversion path in [safari/README.md](safari/README.md).

Workflow file: [`.github/workflows/pack-extension.yml`](.github/workflows/pack-extension.yml).

---

## Project layout

```
manifest.json          # Manifest V3 (Chrome, Firefox, Safari converter input)
content/
  hide-shorts.css      # CSS hide rules
  hide-shorts.js       # MutationObserver + SPA navigation hooks
icons/                 # Extension icons
safari/README.md       # Safari desktop + iOS/iPad packaging path
.github/workflows/     # CI packaging
```

---

## Development

- Edit `content/hide-shorts.js` / `content/hide-shorts.css`, then reload the extension in the browser.
- After changing web sources, re-convert or sync into the Safari Xcode project (see [safari/README.md](safari/README.md)).
- Keep permissions limited to the YouTube hosts listed in `manifest.json`.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
