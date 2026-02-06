import type { SecretClawPluginApi } from "secretclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "secretclaw/plugin-sdk";
import { imessagePlugin } from "./src/channel.js";
import { setIMessageRuntime } from "./src/runtime.js";

const plugin = {
  id: "imessage",
  name: "iMessage",
  description: "iMessage channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: SecretClawPluginApi) {
    setIMessageRuntime(api.runtime);
    api.registerChannel({ plugin: imessagePlugin });
  },
};

export default plugin;
