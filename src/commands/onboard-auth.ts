export { MAPLE_DEFAULT_MODEL_ID, MAPLE_DEFAULT_MODEL_REF } from "../agents/maple-models.js";
export {
  PRIVATEMODE_DEFAULT_MODEL_ID,
  PRIVATEMODE_DEFAULT_MODEL_REF,
} from "../agents/privatemode-models.js";
export {
  applyAuthProfileConfig,
  applyMapleConfig,
  applyMapleProviderConfig,
  applyPrivatemodeConfig,
  applyPrivatemodeProviderConfig,
} from "./onboard-auth.config-core.js";

export {
  setMapleApiKey,
  setPrivatemodeApiKey,
  writeOAuthCredentials,
} from "./onboard-auth.credentials.js";
