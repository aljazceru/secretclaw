import SecretClawKit
import SecretClawProtocol
import Foundation

// Prefer the SecretClawKit wrapper to keep gateway request payloads consistent.
typealias AnyCodable = SecretClawKit.AnyCodable
typealias InstanceIdentity = SecretClawKit.InstanceIdentity

extension AnyCodable {
    var stringValue: String? { self.value as? String }
    var boolValue: Bool? { self.value as? Bool }
    var intValue: Int? { self.value as? Int }
    var doubleValue: Double? { self.value as? Double }
    var dictionaryValue: [String: AnyCodable]? { self.value as? [String: AnyCodable] }
    var arrayValue: [AnyCodable]? { self.value as? [AnyCodable] }

    var foundationValue: Any {
        switch self.value {
        case let dict as [String: AnyCodable]:
            dict.mapValues { $0.foundationValue }
        case let array as [AnyCodable]:
            array.map(\.foundationValue)
        default:
            self.value
        }
    }
}

extension SecretClawProtocol.AnyCodable {
    var stringValue: String? { self.value as? String }
    var boolValue: Bool? { self.value as? Bool }
    var intValue: Int? { self.value as? Int }
    var doubleValue: Double? { self.value as? Double }
    var dictionaryValue: [String: SecretClawProtocol.AnyCodable]? { self.value as? [String: SecretClawProtocol.AnyCodable] }
    var arrayValue: [SecretClawProtocol.AnyCodable]? { self.value as? [SecretClawProtocol.AnyCodable] }

    var foundationValue: Any {
        switch self.value {
        case let dict as [String: SecretClawProtocol.AnyCodable]:
            dict.mapValues { $0.foundationValue }
        case let array as [SecretClawProtocol.AnyCodable]:
            array.map(\.foundationValue)
        default:
            self.value
        }
    }
}
