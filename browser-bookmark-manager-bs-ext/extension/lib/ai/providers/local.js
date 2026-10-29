import { OpenAICompatibleProvider } from './openai-compatible.js';

export class LocalModelProvider extends OpenAICompatibleProvider {
  constructor(config) {
    super({ ...config, baseUrl: config.baseUrl || 'http://localhost:11434/v1' });
  }
}
