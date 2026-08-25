import { Context } from 'hydrooj';

/**
 * Plugin configuration, stored in its own collection ("ai.config"),
 * independent from HydroOJ's global system-setting machinery.
 * There is always exactly one document, keyed by _id: 'config'.
 */
export interface AiConfig {
    _id: 'config';
    // Master switch for all AI features.
    enabled: boolean;
    // OpenAI-compatible API base URL, e.g. "https://api.openai.com/v1".
    apiUrl: string;
    // API key used to authenticate against the AI provider.
    apiKey: string;
    // Model name, e.g. "gpt-4o-mini".
    model: string;
    // System prompt prepended to every conversation.
    systemPrompt: string;
    // Sampling temperature, 0 - 2.
    temperature: number;
    // Max tokens per response.
    maxTokens: number;
    // Max calls per user within the rate-limit window.
    rateLimit: number;
    // Rate-limit window in minutes.
    rateLimitWindow: number;
    // Request timeout in seconds.
    timeout: number;
}

export const DEFAULT_CONFIG: AiConfig = {
    _id: 'config',
    enabled: false,
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    systemPrompt: '你是一个算法竞赛助教。请仅就题目理解和解题思路提供帮助，不要直接给出完整代码。',
    temperature: 0.7,
    maxTokens: 1024,
    rateLimit: 5,
    rateLimitWindow: 10,
    timeout: 60,
};

declare module 'hydrooj' {
    interface Collections {
        'ai.config': AiConfig;
    }
}

async function getConfig(ctx: Context): Promise<AiConfig> {
    const doc = await ctx.db.collection('ai.config').findOne({ _id: 'config' });
    if (!doc) return { ...DEFAULT_CONFIG };
    // Merge with defaults so newly-added fields always have a value
    // even for configs saved by an older version of the plugin.
    return { ...DEFAULT_CONFIG, ...doc };
}

async function saveConfig(ctx: Context, patch: Partial<AiConfig>): Promise<AiConfig> {
    const current = await getConfig(ctx);
    const next: AiConfig = { ...current, ...patch, _id: 'config' };
    await ctx.db.collection('ai.config').updateOne(
        { _id: 'config' },
        { $set: next },
        { upsert: true },
    );
    return next;
}

const AiModel = {
    getConfig, saveConfig, DEFAULT_CONFIG,
};

declare module 'hydrooj' {
    interface Model {
        ai: typeof AiModel;
    }
}

global.Hydro.model.ai = AiModel;

export default AiModel;
