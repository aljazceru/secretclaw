// swift-tools-version: 6.2
// Package manifest for the SecretClaw macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "SecretClaw",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "SecretClawIPC", targets: ["SecretClawIPC"]),
        .library(name: "SecretClawDiscovery", targets: ["SecretClawDiscovery"]),
        .executable(name: "SecretClaw", targets: ["SecretClaw"]),
        .executable(name: "secretclaw-mac", targets: ["SecretClawMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/SecretClawKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "SecretClawIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "SecretClawDiscovery",
            dependencies: [
                .product(name: "SecretClawKit", package: "SecretClawKit"),
            ],
            path: "Sources/SecretClawDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "SecretClaw",
            dependencies: [
                "SecretClawIPC",
                "SecretClawDiscovery",
                .product(name: "SecretClawKit", package: "SecretClawKit"),
                .product(name: "SecretClawChatUI", package: "SecretClawKit"),
                .product(name: "SecretClawProtocol", package: "SecretClawKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/SecretClaw.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "SecretClawMacCLI",
            dependencies: [
                "SecretClawDiscovery",
                .product(name: "SecretClawKit", package: "SecretClawKit"),
                .product(name: "SecretClawProtocol", package: "SecretClawKit"),
            ],
            path: "Sources/SecretClawMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "SecretClawIPCTests",
            dependencies: [
                "SecretClawIPC",
                "SecretClaw",
                "SecretClawDiscovery",
                .product(name: "SecretClawProtocol", package: "SecretClawKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
