# Safari Web Extension (desktop + iOS / iPad)

This project is a Manifest V3 WebExtension. Safari (macOS and iOS/iPadOS) does **not** load unpacked MV3 folders directly the way Chrome or Firefox do. Apple requires an **Xcode wrapper app** that embeds the extension.

You need a Mac with Xcode 14+ (Safari 15.4+ / iOS 15+) to convert and run the extension. This Linux/cloud environment cannot produce signed `.appex` / App Store builds.

## Convert the WebExtension (recommended)

On a Mac, from the repository root:

```bash
# Creates an Xcode project that wraps this extension
xcrun safari-web-extension-converter . \
  --project-location ./safari/YouTubeShortBlocker \
  --app-name "YouTube Short Blocker" \
  --bundle-identifier com.example.youtube-short-blocker \
  --swift \
  --force
```

Then:

1. Open `safari/YouTubeShortBlocker/YouTube Short Blocker.xcodeproj` in Xcode.
2. Select your **Team** under Signing & Capabilities for both the app and the extension targets.
3. Choose a run destination:
   - **My Mac** — Safari desktop
   - An **iOS Simulator** or connected **iPhone / iPad** — Safari for iOS/iPadOS
4. Build and run (⌘R). Xcode installs the containing app; enable the extension in Safari settings.

### Enable on Safari desktop (macOS)

1. Safari → Settings → **Advanced** → enable **Show features for web developers** (or “Show Develop menu”).
2. Safari → Settings → **Extensions** → enable **YouTube Short Blocker**.
3. Allow access to `youtube.com` / `m.youtube.com` when prompted.
4. Optionally: Develop → **Allow Unsigned Extensions** while developing.

### Enable on Safari for iOS / iPadOS

1. Install the containing app (from Xcode onto device/simulator, or TestFlight / App Store later).
2. Open **Settings → Safari → Extensions** (or Apps → YouTube Short Blocker → Extensions, depending on OS version).
3. Enable **YouTube Short Blocker** and set permission to **Allow** for YouTube sites.
4. Open Safari, visit `m.youtube.com` or `youtube.com`, and confirm Shorts rich sections stay hidden.

## Shared sources

Keep editing the root WebExtension files (`manifest.json`, `content/`, `icons/`). Re-run the converter or copy updated resources into the Xcode project’s extension Resources group when the web sources change.

The converter copies (or references) those files into the Safari extension target. Prefer treating the **repo root** as the source of truth for Chrome / Firefox / Chromium, and regenerate or sync into `safari/YouTubeShortBlocker` after substantive changes.

## App Store / distribution notes

- Desktop Safari extensions and iOS Safari Web Extensions ship inside a signed Apple app.
- You need an Apple Developer Program membership for device installs beyond short development provisioning and for App Store distribution.
- iOS and macOS can share one WebExtension codebase; Xcode may produce separate app targets or a multiplatform project depending on converter/Xcode version.

## What this environment cannot do

| Step | Status here |
|------|-------------|
| MV3 sources (`manifest.json`, content scripts) | Done in-repo |
| `safari-web-extension-converter` / Xcode project | Requires macOS + Xcode |
| Device signing, Simulator run, App Store upload | Requires your Mac + Apple Developer account |

After conversion on your Mac, commit the generated Xcode project under `safari/YouTubeShortBlocker/` if you want it versioned (optional; generated projects are large and machine-specific signing settings should stay local or use xcconfig).
