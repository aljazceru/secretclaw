import type { SecretClawPluginApi } from "secretclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "secretclaw/plugin-sdk";
import { msteamsPlugin } from "./src/channel.js";
import { setMSTeamsRuntime } from "./src/runtime.js";

const plugin = {
  id: "msteams",
  name: "Microsoft Teams",
  description: "Microsoft Teams channel plugin (Bot Framework)",
  configSchema: emptyPluginConfigSchema(),
  register(api: SecretClawPluginApi) {
    setMSTeamsRuntime(api.runtime);
    api.registerChannel({ plugin: msteamsPlugin });
  },
};

export default plugin;
