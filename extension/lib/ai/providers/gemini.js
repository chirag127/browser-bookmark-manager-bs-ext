import { OpenAICompatibleProvider } from './openai-compatible.js';

export class GeminiProvider extends OpenAICompatibleProvider {
  constructor(config) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai',
    });
  }
}
