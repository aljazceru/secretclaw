import type { SecretClawPluginApi } from "secretclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "secretclaw/plugin-sdk";
import { feishuPlugin } from "./src/channel.js";

const plugin = {
  id: "feishu",
  name: "Feishu",
  description: "Feishu (Lark) channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: SecretClawPluginApi) {
    api.registerChannel({ plugin: feishuPlugin });
  },
};

export default plugin;
