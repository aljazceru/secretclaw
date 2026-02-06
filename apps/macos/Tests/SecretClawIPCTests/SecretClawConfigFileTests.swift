import Foundation
import Testing
@testable import SecretClaw

@Suite(.serialized)
struct SecretClawConfigFileTests {
    @Test
    func configPathRespectsEnvOverride() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("secretclaw-config-\(UUID().uuidString)")
            .appendingPathComponent("secretclaw.json")
            .path

        await TestIsolation.withEnvValues(["SECRETCLAW_CONFIG_PATH": override]) {
            #expect(SecretClawConfigFile.url().path == override)
        }
    }

    @MainActor
    @Test
    func remoteGatewayPortParsesAndMatchesHost() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("secretclaw-config-\(UUID().uuidString)")
            .appendingPathComponent("secretclaw.json")
            .path

        await TestIsolation.withEnvValues(["SECRETCLAW_CONFIG_PATH": override]) {
            SecretClawConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "ws://gateway.ts.net:19999",
                    ],
                ],
            ])
            #expect(SecretClawConfigFile.remoteGatewayPort() == 19999)
            #expect(SecretClawConfigFile.remoteGatewayPort(matchingHost: "gateway.ts.net") == 19999)
            #expect(SecretClawConfigFile.remoteGatewayPort(matchingHost: "gateway") == 19999)
            #expect(SecretClawConfigFile.remoteGatewayPort(matchingHost: "other.ts.net") == nil)
        }
    }

    @MainActor
    @Test
    func setRemoteGatewayUrlPreservesScheme() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("secretclaw-config-\(UUID().uuidString)")
            .appendingPathComponent("secretclaw.json")
            .path

        await TestIsolation.withEnvValues(["SECRETCLAW_CONFIG_PATH": override]) {
            SecretClawConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "wss://old-host:111",
                    ],
                ],
            ])
            SecretClawConfigFile.setRemoteGatewayUrl(host: "new-host", port: 2222)
            let root = SecretClawConfigFile.loadDict()
            let url = ((root["gateway"] as? [String: Any])?["remote"] as? [String: Any])?["url"] as? String
            #expect(url == "wss://new-host:2222")
        }
    }

    @Test
    func stateDirOverrideSetsConfigPath() async {
        let dir = FileManager().temporaryDirectory
            .appendingPathComponent("secretclaw-state-\(UUID().uuidString)", isDirectory: true)
            .path

        await TestIsolation.withEnvValues([
            "SECRETCLAW_CONFIG_PATH": nil,
            "SECRETCLAW_STATE_DIR": dir,
        ]) {
            #expect(SecretClawConfigFile.stateDirURL().path == dir)
            #expect(SecretClawConfigFile.url().path == "\(dir)/secretclaw.json")
        }
    }
}
