import { OpenAICompatibleProvider } from './openai-compatible.js';

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor(config) {
    super({ ...config, baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1' });
  }
}
