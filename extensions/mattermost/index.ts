import type { SecretClawPluginApi } from "secretclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "secretclaw/plugin-sdk";
import { mattermostPlugin } from "./src/channel.js";
import { setMattermostRuntime } from "./src/runtime.js";

const plugin = {
  id: "mattermost",
  name: "Mattermost",
  description: "Mattermost channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: SecretClawPluginApi) {
    setMattermostRuntime(api.runtime);
    api.registerChannel({ plugin: mattermostPlugin });
  },
};

export default plugin;
