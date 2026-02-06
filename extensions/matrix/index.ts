import type { SecretClawPluginApi } from "secretclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "secretclaw/plugin-sdk";
import { matrixPlugin } from "./src/channel.js";
import { setMatrixRuntime } from "./src/runtime.js";

const plugin = {
  id: "matrix",
  name: "Matrix",
  description: "Matrix channel plugin (matrix-js-sdk)",
  configSchema: emptyPluginConfigSchema(),
  register(api: SecretClawPluginApi) {
    setMatrixRuntime(api.runtime);
    api.registerChannel({ plugin: matrixPlugin });
  },
};

export default plugin;
