import type { SecretClawPluginApi } from "secretclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "secretclaw/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: SecretClawPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;
