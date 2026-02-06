import Testing
@testable import SecretClaw

@Suite(.serialized)
@MainActor
struct WebChatManagerTests {
    @Test func preferredSessionKeyIsNonEmpty() async {
        let key = await WebChatManager.shared.preferredSessionKey()
        #expect(!key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    }
}
