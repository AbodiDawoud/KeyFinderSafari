# KeyFinderSafari

I built this as a Safari Web Extension version of KeyFinder.

It passively scans pages for exposed API keys, tokens, secrets, and credential-like values. The scanner runs in JavaScript inside the extension. The Swift app is only the macOS container Safari needs so the extension can be installed, enabled, and managed.

## What I Scan

- Inline scripts and same-origin external scripts
- Script URLs, links, and URL parameters
- Meta tags, hidden inputs, data attributes, and HTML comments
- Cookies, `localStorage`, and `sessionStorage`
- Runtime response text seen by the injected interceptor

Findings are stored locally with `chrome.storage.local` and shown through the extension popup/results UI.

## Run It

Open `KeyFinderSafari.xcodeproj` in Xcode, set a signing team for both targets, build the app, then enable the extension in Safari Settings > Extensions.

For an unsigned local build:

```sh
xcodebuild -project KeyFinderSafari.xcodeproj -scheme KeyFinderSafari -configuration Debug -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
```

Safari may still require a signed build for normal extension use. For temporary testing, enable Safari's Develop menu and allow unsigned extensions.

## Layout

- `KeyFinderSafari/` - macOS container app.
- `KeyFinderSafariExtension/` - Safari Web Extension target.
- `KeyFinderSafariExtension/Resources/js/` - scanner, background worker, popup logic, and detection patterns.
