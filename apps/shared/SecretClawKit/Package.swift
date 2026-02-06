// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "SecretClawKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15),
    ],
    products: [
        .library(name: "SecretClawProtocol", targets: ["SecretClawProtocol"]),
        .library(name: "SecretClawKit", targets: ["SecretClawKit"]),
        .library(name: "SecretClawChatUI", targets: ["SecretClawChatUI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/steipete/ElevenLabsKit", exact: "0.1.0"),
        .package(url: "https://github.com/gonzalezreal/textual", exact: "0.3.1"),
    ],
    targets: [
        .target(
            name: "SecretClawProtocol",
            path: "Sources/SecretClawProtocol",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "SecretClawKit",
            dependencies: [
                "SecretClawProtocol",
                .product(name: "ElevenLabsKit", package: "ElevenLabsKit"),
            ],
            path: "Sources/SecretClawKit",
            resources: [
                .process("Resources"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "SecretClawChatUI",
            dependencies: [
                "SecretClawKit",
                .product(
                    name: "Textual",
                    package: "textual",
                    condition: .when(platforms: [.macOS, .iOS])),
            ],
            path: "Sources/SecretClawChatUI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "SecretClawKitTests",
            dependencies: ["SecretClawKit", "SecretClawChatUI"],
            path: "Tests/SecretClawKitTests",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
