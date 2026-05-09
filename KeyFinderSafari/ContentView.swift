import SafariServices
import SwiftUI

private let extensionBundleIdentifier = "com.local.KeyFinderSafari.Extension"

struct ContentView: View {
    @State private var isEnabled = false
    @State private var statusMessage = "Checking Safari extension status..."

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 16) {
                Image(nsImage: NSImage(named: NSImage.applicationIconName) ?? NSImage())
                    .resizable()
                    .frame(width: 64, height: 64)

                VStack(alignment: .leading, spacing: 6) {
                    Text("KeyFinder for Safari")
                        .font(.system(size: 28, weight: .semibold))
                    Text("Passive API key and secret discovery packaged as a Safari Web Extension.")
                        .foregroundStyle(.secondary)
                }
            }

            Divider()

            VStack(alignment: .leading, spacing: 10) {
                Label(isEnabled ? "Extension enabled" : "Extension not enabled", systemImage: isEnabled ? "checkmark.circle.fill" : "exclamationmark.circle")
                    .foregroundStyle(isEnabled ? .green : .orange)
                    .font(.headline)

                Text(statusMessage)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            HStack {
                Button("Open Safari Extension Settings") {
                    openSafariExtensionSettings()
                }
                .buttonStyle(.borderedProminent)

                Button("Refresh Status") {
                    refreshState()
                }
            }
        }
        .padding(28)
        .onAppear(perform: refreshState)
    }

    private func refreshState() {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { state, error in
            DispatchQueue.main.async {
                if let error {
                    isEnabled = false
                    statusMessage = "Safari could not read the extension state: \(error.localizedDescription)"
                    return
                }

                isEnabled = state?.isEnabled == true
                statusMessage = isEnabled
                    ? "You can browse normally. KeyFinder will scan pages when Safari grants website access."
                    : "Enable KeyFinderSafari Extension in Safari Settings, then grant website access when Safari asks."
            }
        }
    }

    private func openSafariExtensionSettings() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            DispatchQueue.main.async {
                if let error {
                    statusMessage = "Could not open Safari extension settings: \(error.localizedDescription)"
                }
            }
        }
    }
}
