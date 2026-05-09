# KeyFinder Safari Port

This folder contains a macOS Safari Web Extension wrapper for the existing KeyFinder extension.

The scanner still runs as JavaScript. Safari loads `manifest.json`, injects the content scripts, runs the background script, and shows the popup/results pages from the extension bundle. The Swift code is the containing macOS app plus the Safari native extension handler that Safari requires for packaging.

## Project Layout

- `KeyFinderSafari.xcodeproj` - Xcode project with the macOS app and Safari Web Extension targets.
- `KeyFinderSafari/` - Swift containing app that opens Safari extension settings and shows enabled status.
- `KeyFinderSafariExtension/SafariWebExtensionHandler.swift` - Native message handler placeholder.
- `KeyFinderSafariExtension/Resources/` - Copied web-extension resources from the root project.

## Build

```sh
xcodebuild -project KeyFinderSafari/KeyFinderSafari.xcodeproj -scheme KeyFinderSafari -configuration Debug -derivedDataPath KeyFinderSafari/build CODE_SIGNING_ALLOWED=NO build
```

For local Safari testing from Xcode, use a normal signing team instead of `CODE_SIGNING_ALLOWED=NO`, then run the app and enable the extension in Safari Settings.

## If the Extension Only Appears When Running from Xcode

Safari discovers web extensions through the containing macOS app. Xcode can register a development build while it is running, but a normal app launch usually needs the app and embedded `.appex` to be signed with a valid Apple Development identity.

For persistent local testing:

1. In Xcode, select both `KeyFinderSafari` and `KeyFinderSafari Extension`.
2. Open **Signing & Capabilities** for each target.
3. Select your Apple development team.
4. Use a unique bundle identifier instead of `com.local.KeyFinderSafari`.
5. Build and run the app once, then open Safari Settings > Extensions.

If you do not have a signing identity, enable Safari's Develop menu and use **Develop > Allow Unsigned Extensions** for temporary testing. Safari may require that setting again after restarting.

## Updating the JavaScript Core

If the root extension changes, copy the updated web resources into:

```text
KeyFinderSafari/KeyFinderSafariExtension/Resources/
```

The current port copied:

- `manifest.json`
- `popup.html`
- `results.html`
- `js/`
- `css/`
- `icons/`
