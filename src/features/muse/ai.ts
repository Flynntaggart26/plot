import { isTauriRuntime } from '@/lib/file-transfer';
import { getSetting, setSetting } from '@/features/settings/preferences';

/**
 * Muse için model bağlantısı.
 *
 * İki sağlayıcı var ve ikisi de aynı dar sözleşmeyi uygular:
 * - `ollama`: bilgisayarda çalışan yerel model (`/api/chat`).
 * - `openai`: OpenAI uyumlu her sunucu (`/chat/completions`) — OpenRouter,
 *   LM Studio, llama.cpp sunucusu vb.
 *
 * Masaüstünde istek Rust tarafından yapılır: WebView'in CORS kuralları
 * yerel Ollama'ya doğrudan erişimi engeller, Rust tarafında böyle bir
 * kısıt yok. Tarayıcıda ve mobilde normal `fetch` kullanılır.
 */

export type AiProvider = 'ollama' | 'openai';

export type AiConfig = {
  provider: AiProvider;
  /** Sondaki `/` temizlenmiş sunucu adresi. */
  baseUrl: string;
  model: string;
  /** Yalnızca `openai` sağlayıcısında kullanılır. */
  apiKey: string;
  /** Kullanıcı bağlantıyı bilinçli olarak kurdu mu? */
  enabled: boolean;
};

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type AiReply = {
  content: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
};

export const AI_KEYS = {
  provider: 'ai_provider',
  baseUrl: 'ai_base_url',
  model: 'ai_model',
  apiKey: 'ai_api_key',
  enabled: 'ai_enabled',
} as const;

export const AI_PRESETS: Record<
  AiProvider,
  { label: string; baseUrl: string; model: string; hint: string; needsKey: boolean }
> = {
  ollama: {
    label: 'Ollama',
    baseUrl: 'http://127.0.0.1:11434',
    model: 'llama3.2',
    hint: 'Bilgisayarında çalışır. İstek cihazdan çıkmaz, ücret yok.',
    needsKey: false,
  },
  openai: {
    label: 'OpenAI uyumlu',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: 'OpenAI, OpenRouter, LM Studio veya yerel bir sunucu.',
    needsKey: true,
  },
};

function trimBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function getAiConfig(): AiConfig {
  const provider = getSetting(AI_KEYS.provider) === 'openai' ? 'openai' : 'ollama';
  const preset = AI_PRESETS[provider];

  return {
    provider,
    baseUrl: trimBaseUrl(getSetting(AI_KEYS.baseUrl) || preset.baseUrl),
    model: getSetting(AI_KEYS.model)?.trim() || preset.model,
    apiKey: getSetting(AI_KEYS.apiKey) ?? '',
    enabled: getSetting(AI_KEYS.enabled) === '1',
  };
}

export function setAiConfig(patch: Partial<AiConfig>): AiConfig {
  if (patch.provider !== undefined) {
    setSetting(AI_KEYS.provider, patch.provider === 'openai' ? 'openai' : 'ollama');
  }
  if (patch.baseUrl !== undefined) {
    setSetting(AI_KEYS.baseUrl, trimBaseUrl(patch.baseUrl));
  }
  if (patch.model !== undefined) {
    setSetting(AI_KEYS.model, patch.model.trim());
  }
  if (patch.apiKey !== undefined) {
    setSetting(AI_KEYS.apiKey, patch.apiKey.trim());
  }
  if (patch.enabled !== undefined) {
    setSetting(AI_KEYS.enabled, patch.enabled ? '1' : '0');
  }
  return getAiConfig();
}

// ─── İstek katmanı ───────────────────────────────────────────────────────────

type HttpResult = { status: number; body: string };

/** Kullanıcıya gösterilebilir AI hatası; mesaj her zaman Türkçe. */
export class AiError extends Error {
  /** `auth` ve `connection` hatalarında ayar ekranına yönlendirmek için. */
  readonly kind: 'connection' | 'auth' | 'model' | 'response' | 'config';

  constructor(message: string, kind: AiError['kind'] = 'response') {
    super(message);
    this.name = 'AiError';
    this.kind = kind;
  }
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number,
): Promise<HttpResult> {
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    try {
      return await invoke<HttpResult>('ai_http_post', {
        url,
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
        timeoutMs,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (message.startsWith('TIMEOUT')) {
        throw new AiError('Model zamanında yanıt vermedi. Daha küçük bir model dene.', 'connection');
      }
      if (message.startsWith('CONNECT')) {
        throw connectionError(url);
      }
      throw new AiError(`İstek gönderilemedi: ${message}`, 'connection');
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
      signal: controller.signal,
    });
    return { status: response.status, body: await response.text() };
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    throw aborted
      ? new AiError('Model zamanında yanıt vermedi. Daha küçük bir model dene.', 'connection')
      : connectionError(url);
  } finally {
    clearTimeout(timer);
  }
}

function connectionError(url: string): AiError {
  const local = /\/\/(127\.0\.0\.1|localhost)/.test(url);
  return new AiError(
    local
      ? 'Yerel modele ulaşılamadı. Ollama çalışıyor mu? Terminalde `ollama serve` komutunu deneyin.'
      : 'Sunucuya ulaşılamadı. Adresi ve internet bağlantısını denetleyin.',
    'connection',
  );
}

function errorMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === 'string') return parsed.error;
    if (parsed.error && typeof parsed.error === 'object') {
      const nested = (parsed.error as { message?: unknown }).message;
      if (typeof nested === 'string') return nested;
    }
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // Gövde JSON değilse ham metnin ilk satırı yeterli.
  }
  return body.trim().split('\n')[0]?.slice(0, 200) || null;
}

function httpError(status: number, body: string): AiError {
  const detail = errorMessage(body);

  if (status === 401 || status === 403) {
    return new AiError('Anahtar reddedildi. Ayarlarda API anahtarını denetleyin.', 'auth');
  }
  if (status === 404) {
    return new AiError(
      detail
        ? `Model bulunamadı: ${detail}`
        : 'Model bulunamadı. Model adını ve sunucu adresini denetleyin.',
      'model',
    );
  }
  if (status === 429) {
    return new AiError('Sağlayıcı istek sınırına takıldı. Biraz sonra tekrar deneyin.', 'response');
  }

  return new AiError(detail ? `Model hatası: ${detail}` : `Model hatası (${status}).`, 'response');
}

function jsonHeaders(config: AiConfig): Record<string, string> {
  if (config.provider === 'openai' && config.apiKey) {
    return { Authorization: `Bearer ${config.apiKey}` };
  }
  return {};
}

function bodyFor(config: AiConfig, turns: ChatTurn[], system: string): string {
  const messages = [{ role: 'system', content: system }, ...turns];

  if (config.provider === 'ollama') {
    return JSON.stringify({ model: config.model, messages, stream: false });
  }

  return JSON.stringify({ model: config.model, messages, temperature: 0.6 });
}

function parseReply(config: AiConfig, body: string): AiReply {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new AiError('Model yanıtı okunamadı.', 'response');
  }

  if (config.provider === 'ollama') {
    const data = parsed as {
      message?: { content?: unknown };
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const content = typeof data.message?.content === 'string' ? data.message.content.trim() : '';
    if (!content) throw new AiError('Model boş yanıt döndü.', 'response');
    return {
      content,
      model: config.model,
      tokensIn: data.prompt_eval_count ?? null,
      tokensOut: data.eval_count ?? null,
    };
  }

  const data = parsed as {
    choices?: { message?: { content?: unknown } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content =
    typeof data.choices?.[0]?.message?.content === 'string'
      ? data.choices[0].message.content.trim()
      : '';
  if (!content) throw new AiError('Model boş yanıt döndü.', 'response');
  return {
    content,
    model: config.model,
    tokensIn: data.usage?.prompt_tokens ?? null,
    tokensOut: data.usage?.completion_tokens ?? null,
  };
}

/** Muse'un kimliği: kısa, sakin, eyleme dönük; süsleme yok. */
export const MUSE_SYSTEM_PROMPT = [
  'Sen Muse\'sun: Plot adlı ADHD dostu günlük planlama uygulamasının asistanı.',
  'Türkçe, kısa ve sakin yanıt ver. Gereksiz başlık, emoji ve övgü kullanma.',
  'Kullanıcı bir işi erteliyorsa işi küçült: ilk 5 dakikada yapılabilecek tek adımı öner.',
  'Plot\'ta bir günde en fazla üç must-do olur ve enerji 1-5 arasında tutulur; önerilerinde bunu gözet.',
  'Emin olmadığın bilgiyi uydurma. Kullanıcının verisine erişimin yok; yalnızca yazdıklarına dayan.',
].join(' ');

export const AI_TIMEOUT_MS = 120_000;

async function complete(
  config: AiConfig,
  turns: ChatTurn[],
  system: string = MUSE_SYSTEM_PROMPT,
): Promise<AiReply> {
  if (!config.enabled) {
    throw new AiError('Muse henüz bir modele bağlı değil.', 'config');
  }
  if (!config.baseUrl) {
    throw new AiError('Sunucu adresi boş.', 'config');
  }
  if (config.provider === 'openai' && !config.apiKey) {
    throw new AiError('OpenAI uyumlu sağlayıcı için API anahtarı gerekli.', 'config');
  }

  const url =
    config.provider === 'ollama'
      ? `${config.baseUrl}/api/chat`
      : `${config.baseUrl}/chat/completions`;

  const result = await postJson(
    url,
    jsonHeaders(config),
    bodyFor(config, turns, system),
    AI_TIMEOUT_MS,
  );

  if (result.status < 200 || result.status >= 300) {
    throw httpError(result.status, result.body);
  }

  return parseReply(config, result.body);
}

/** Sohbet için: geçmişi sınırlar, tek istekte yanıt ister. */
export async function chatWithMuse(
  turns: ChatTurn[],
  config: AiConfig = getAiConfig(),
): Promise<AiReply> {
  const recent = turns.filter((turn) => turn.content.trim()).slice(-16);
  if (recent.length === 0) {
    throw new AiError('Gönderilecek mesaj yok.', 'config');
  }
  return complete(config, recent);
}

/** Ayarlarda "Bağlantıyı dene": gerçek bir istek atar, gecikmeyi ölçer. */
export async function testAiConnection(
  config: AiConfig,
): Promise<{ model: string; latencyMs: number; reply: string }> {
  const startedAt = Date.now();
  const reply = await complete(
    { ...config, enabled: true },
    [{ role: 'user', content: 'Yalnızca "tamam" yaz.' }],
    'Kısa yanıt ver. En fazla iki kelime.',
  );

  return {
    model: reply.model,
    latencyMs: Date.now() - startedAt,
    reply: reply.content,
  };
}
