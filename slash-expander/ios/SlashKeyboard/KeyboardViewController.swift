import UIKit

/// A tiny "expander" keyboard.
///
/// Flow: type `/availability-tomorrow` with your normal keyboard, tap 🌐 to switch
/// to this keyboard. It sees the trigger right before the cursor, replaces it with
/// the drafted message, then hands you back to your normal keyboard.
final class KeyboardViewController: UIInputViewController {
    private let statusLabel = UILabel()
    private let commandStack = UIStackView()
    private var isExpanding = false

    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        expandTriggerBeforeCursor(autoReturn: true)
    }

    // MARK: - Expansion

    /// Returns the `/command` immediately before the cursor, if any.
    private func triggerBeforeCursor() -> String? {
        guard let before = textDocumentProxy.documentContextBeforeInput else { return nil }
        let trimmed = before.replacingOccurrences(of: "\\s+$", with: "", options: .regularExpression)
        guard let range = trimmed.range(of: "(?:^|(?<=\\s))/[a-z0-9-]+$", options: [.regularExpression, .caseInsensitive]) else {
            return nil
        }
        // Include any trailing whitespace so it is deleted too.
        let triggerLength = trimmed.distance(from: range.lowerBound, to: trimmed.endIndex)
        return String(before.suffix(triggerLength + (before.count - trimmed.count)))
    }

    private func expandTriggerBeforeCursor(autoReturn: Bool) {
        guard let trigger = triggerBeforeCursor() else {
            statusLabel.text = "Type a /command, then switch to this keyboard."
            return
        }
        let command = trigger.trimmingCharacters(in: .whitespaces)
        run(command: command, deleting: trigger.count, autoReturn: autoReturn)
    }

    private func run(command: String, deleting charsToDelete: Int, autoReturn: Bool) {
        guard !isExpanding else { return }
        guard hasFullAccess else {
            statusLabel.text = "Enable Allow Full Access in Settings › Keyboards to reach your server."
            return
        }
        isExpanding = true
        statusLabel.text = "✨ Drafting \(command)…"

        ExpanderClient.expand(command: command) { [weak self] result in
            DispatchQueue.main.async {
                guard let self else { return }
                self.isExpanding = false
                switch result {
                case .success(let text):
                    for _ in 0..<charsToDelete { self.textDocumentProxy.deleteBackward() }
                    self.textDocumentProxy.insertText(text)
                    self.statusLabel.text = "Inserted \(command)"
                    if autoReturn { self.advanceToNextInputMode() }
                case .failure(let error):
                    self.statusLabel.text = "⚠️ \(error.localizedDescription)"
                }
            }
        }
    }

    // MARK: - UI

    private func buildUI() {
        statusLabel.font = .preferredFont(forTextStyle: .footnote)
        statusLabel.textAlignment = .center
        statusLabel.numberOfLines = 2

        commandStack.axis = .vertical
        commandStack.spacing = 6
        for command in ExpanderConfig.quickCommands {
            commandStack.addArrangedSubview(makeButton(title: command) { [weak self] in
                self?.run(command: command, deleting: 0, autoReturn: false)
            })
        }

        let bottomRow = UIStackView(arrangedSubviews: [
            makeButton(title: "🌐") { [weak self] in self?.advanceToNextInputMode() },
            makeButton(title: "Expand /command") { [weak self] in self?.expandTriggerBeforeCursor(autoReturn: false) },
            makeButton(title: "⌫") { [weak self] in self?.textDocumentProxy.deleteBackward() },
        ])
        bottomRow.spacing = 6
        bottomRow.distribution = .fillProportionally

        let root = UIStackView(arrangedSubviews: [statusLabel, commandStack, bottomRow])
        root.axis = .vertical
        root.spacing = 8
        root.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(root)
        NSLayoutConstraint.activate([
            root.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            root.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            root.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            root.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -8),
            view.heightAnchor.constraint(greaterThanOrEqualToConstant: 200),
        ])
    }

    private func makeButton(title: String, action: @escaping () -> Void) -> UIButton {
        var config = UIButton.Configuration.gray()
        config.title = title
        let button = UIButton(configuration: config, primaryAction: UIAction { _ in action() })
        button.heightAnchor.constraint(equalToConstant: 40).isActive = true
        return button
    }
}
