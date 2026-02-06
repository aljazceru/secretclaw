import type { SecretClawPluginApi } from "secretclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "secretclaw/plugin-sdk";
import { telegramPlugin } from "./src/channel.js";
import { setTelegramRuntime } from "./src/runtime.js";

const plugin = {
  id: "telegram",
  name: "Telegram",
  description: "Telegram channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: SecretClawPluginApi) {
    setTelegramRuntime(api.runtime);
    api.registerChannel({ plugin: telegramPlugin });
  },
};

export default plugin;
