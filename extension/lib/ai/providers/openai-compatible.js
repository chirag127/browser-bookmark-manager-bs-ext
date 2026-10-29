import { AIProvider } from './provider-registry.js';

export class OpenAICompatibleProvider extends AIProvider {
  constructor(config) {
    super(config);
  }
  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) h['Authorization'] = 'Bearer ' + this.config.apiKey;
    if (this.config.organization) h['OpenAI-Organization'] = this.config.organization;
    if (this.config.extraHeaders) Object.assign(h, this.config.extraHeaders);
    return h;
  }
  _url(path) {
    const base = (this.config.baseUrl || '').replace(/\/$/, '');
    return base + path;
  }
  async testConnection(signal) {
    try {
      const res = await fetch(this._url('/models'), { headers: this._headers(), signal: signal });
      if (!res.ok) return { ok: false, status: res.status, message: 'HTTP ' + res.status };
      const data = await res.json().catch(() => ({}));
      return {
        ok: true,
        status: res.status,
        models: Array.isArray(data.data) ? data.data.map((m) => m.id) : [],
      };
    } catch (e) {
      return { ok: false, message: String(e && e.message ? e.message : e) };
    }
  }
  async listModels(signal) {
    const r = await this.testConnection(signal);
    return (r.models || []).map((id) => ({ id: id, name: id }));
  }
  async _chat(messages, signal) {
    const body = {
      model: this.config.model,
      messages: messages,
      temperature: this.config.temperature != null ? this.config.temperature : 0.2,
      max_tokens: this.config.maxTokens || 2048,
    };
    if (this.config.responseFormatJson) body.response_format = { type: 'json_object' };
    const res = await fetch(this._url('/chat/completions'), {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
      signal: signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error('HTTP ' + res.status + ': ' + txt.slice(0, 200));
    }
    const data = await res.json();
    const content =
      (data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content) ||
      '';
    return content;
  }
  async categorize(input, signal) {
    const system = input.prompt.system;
    const user = input.prompt.user;
    const content = await this._chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      signal
    );
    let parsed = null;
    try {
      const cleaned = content
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      parsed = null;
    }
    return { raw: content, parsed: parsed };
  }
  async generateDescription(input, signal) {
    const content = await this._chat(
      [
        {
          role: 'system',
          content: 'Return strict JSON: {"description":string,"title":string}. Concise.',
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
      signal
    );
    let parsed = null;
    try {
      parsed = JSON.parse(
        content
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim()
      );
    } catch (e) {
      /* ignore */
    }
    return { raw: content, parsed: parsed };
  }
}
