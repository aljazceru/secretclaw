import type { SecretClawPluginApi } from "secretclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "secretclaw/plugin-sdk";
import { signalPlugin } from "./src/channel.js";
import { setSignalRuntime } from "./src/runtime.js";

const plugin = {
  id: "signal",
  name: "Signal",
  description: "Signal channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: SecretClawPluginApi) {
    setSignalRuntime(api.runtime);
    api.registerChannel({ plugin: signalPlugin });
  },
};

export default plugin;
