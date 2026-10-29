import { OpenAICompatibleProvider } from './providers/openai-compatible.js';
import { GeminiProvider } from './providers/gemini.js';
import { OpenRouterProvider } from './providers/openrouter.js';
import { LocalModelProvider } from './providers/local.js';

export const PROVIDER_TYPES = {
  gemini: GeminiProvider,
  openrouter: OpenRouterProvider,
  openai: OpenAICompatibleProvider,
  custom: OpenAICompatibleProvider,
  local: LocalModelProvider,
  groq: (cfg) =>
    new OpenAICompatibleProvider({
      ...cfg,
      baseUrl: cfg.baseUrl || 'https://api.groq.com/openai/v1',
    }),
  mistral: (cfg) =>
    new OpenAICompatibleProvider({ ...cfg, baseUrl: cfg.baseUrl || 'https://api.mistral.ai/v1' }),
  cloudflare: (cfg) => new OpenAICompatibleProvider(cfg),
  nvidia: (cfg) =>
    new OpenAICompatibleProvider({
      ...cfg,
      baseUrl: cfg.baseUrl || 'https://integrate.api.nvidia.com/v1',
    }),
};

export function createProvider(config) {
  if (!config) return null;
  const type = config.type || 'custom';
  const Ctor = PROVIDER_TYPES[type];
  if (!Ctor) return new OpenAICompatibleProvider(config);
  if (typeof Ctor === 'function' && Ctor.prototype && Ctor.prototype.constructor === Ctor) {
    return new Ctor(config);
  }
  return Ctor(config);
}

export function providerFromSettings(settings) {
  if (!settings || settings.aiEnabled === false) return null;
  const cfg = settings.providerConfig;
  if (!cfg) return null;
  return createProvider(cfg);
}
