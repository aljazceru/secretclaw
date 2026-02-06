import Foundation

public enum SecretClawCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum SecretClawCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum SecretClawCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum SecretClawCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct SecretClawCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: SecretClawCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: SecretClawCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: SecretClawCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: SecretClawCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct SecretClawCameraClipParams: Codable, Sendable, Equatable {
    public var facing: SecretClawCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: SecretClawCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: SecretClawCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: SecretClawCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
