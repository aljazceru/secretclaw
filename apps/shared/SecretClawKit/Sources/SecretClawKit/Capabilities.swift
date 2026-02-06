import Foundation

public enum SecretClawCapability: String, Codable, Sendable {
    case canvas
    case camera
    case screen
    case voiceWake
    case location
}
