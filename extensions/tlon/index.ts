import type { SecretClawPluginApi } from "secretclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "secretclaw/plugin-sdk";
import { tlonPlugin } from "./src/channel.js";
import { setTlonRuntime } from "./src/runtime.js";

const plugin = {
  id: "tlon",
  name: "Tlon",
  description: "Tlon/Urbit channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: SecretClawPluginApi) {
    setTlonRuntime(api.runtime);
    api.registerChannel({ plugin: tlonPlugin });
  },
};

export default plugin;
