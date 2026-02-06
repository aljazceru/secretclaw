import Foundation

public enum SecretClawChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(SecretClawChatEventPayload)
    case agent(SecretClawAgentEventPayload)
    case seqGap
}

public protocol SecretClawChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> SecretClawChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [SecretClawChatAttachmentPayload]) async throws -> SecretClawChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> SecretClawChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<SecretClawChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension SecretClawChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "SecretClawChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> SecretClawChatSessionsListResponse {
        throw NSError(
            domain: "SecretClawChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}
