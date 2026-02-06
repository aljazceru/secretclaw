import Foundation

public enum SecretClawLocationMode: String, Codable, Sendable, CaseIterable {
    case off
    case whileUsing
    case always
}
