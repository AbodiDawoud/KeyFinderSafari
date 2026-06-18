# Key Finder Safari

This tool is the Safari Web Extenstion version of [KeyFinder](https://github.com/momenbasel/keyfinder).

The tool passively scans pages for exposed API keys, tokens, secrets, and credential-like values. The scanner runs in JavaScript inside the extension. The Swift app is only the macOS container Safari needs so the extension can be installed, enabled, and managed.

<img  alt="Screenshot 2026-05-17 at 1 39 21 AM" src="https://github.com/user-attachments/assets/91fe08ab-ace5-4bec-9931-784a34302f31" />

## What It Scan

- API Keys and tokens
- Cookies, `localStorage`, and `sessionStorage`
- Script URLs, links, and URL parameters
- Inline scripts and same-origin external scripts
- Meta tags, hidden inputs, data attributes, and HTML comments
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
