import type { SecretClawPluginApi } from "secretclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "secretclaw/plugin-sdk";
import { discordPlugin } from "./src/channel.js";
import { setDiscordRuntime } from "./src/runtime.js";

const plugin = {
  id: "discord",
  name: "Discord",
  description: "Discord channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: SecretClawPluginApi) {
    setDiscordRuntime(api.runtime);
    api.registerChannel({ plugin: discordPlugin });
  },
};

export default plugin;
