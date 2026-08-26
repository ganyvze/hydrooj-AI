import { Context } from 'hydrooj';

export interface AiConfig {
    _id: 'config';
    enabled: boolean;
    apiUrl: string;
    apiKey: string;
    model: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    rateLimit: number;
    rateLimitWindow: number;
    timeout: number;
}

export interface AiRateLimitDoc {
    _id: string;
    timestamps: Date[];
}

export const DEFAULT_CONFIG: AiConfig = {
    _id: 'config',
    enabled: false,
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    systemPrompt: '你是一个算法竞赛助教。请仅就题目理解、解题思路与代码疑点提供启发式帮助，不要直接给出完整代码。',
    temperature: 0.7,
    maxTokens: 1024,
    rateLimit: 5,
    rateLimitWindow: 10,
    timeout: 60,
};

declare module 'hydrooj' {
    interface Collections {
        'ai.config': AiConfig;
        'ai.ratelimit': AiRateLimitDoc;
    }
}

async function getConfig(ctx: Context): Promise<AiConfig> {
    const doc = await ctx.db.collection('ai.config').findOne({ _id: 'config' });
    if (!doc) return { ...DEFAULT_CONFIG };
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

async function checkRateLimit(
    ctx: Context,
    uid: number | string,
    config: AiConfig,
): Promise<{ ok: boolean; waitSeconds?: number }> {
    const coll = ctx.db.collection('ai.ratelimit');
    const now = Date.now();
    const windowMs = (config.rateLimitWindow || 10) * 60 * 1000;
    const maxLimit = config.rateLimit || 5;
    const cutoff = new Date(now - windowMs);

    const doc = await coll.findOne({ _id: uid.toString() });
    const timestamps: Date[] = (doc?.timestamps || []).filter(
        (t: Date) => new Date(t).getTime() > cutoff.getTime(),
    );

    if (timestamps.length >= maxLimit) {
        const oldestTime = new Date(timestamps[0]).getTime();
        const waitSeconds = Math.max(1, Math.ceil((oldestTime + windowMs - now) / 1000));
        return { ok: false, waitSeconds };
    }

    timestamps.push(new Date(now));
    await coll.updateOne(
        { _id: uid.toString() },
        { $set: { timestamps } },
        { upsert: true },
    );

    return { ok: true };
}

const AiModel = {
    getConfig,
    saveConfig,
    checkRateLimit,
    DEFAULT_CONFIG,
};

declare module 'hydrooj' {
    interface Model {
        ai: typeof AiModel;
    }
}

global.Hydro.model.ai = AiModel;

export default AiModel;