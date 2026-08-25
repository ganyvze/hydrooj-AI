import {
    Context, Handler, OpcountModel, PRIV, ProblemModel, RecordModel,
    param, Schema, SystemModel, superagent, Types,
} from 'hydrooj';
import { ObjectId } from 'mongodb';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

declare module 'hydrooj' {
    interface SystemKeys {
        'ai-assistant.apiBaseUrl': string;
        'ai-assistant.apiKey': string;
        'ai-assistant.model': string;
        'ai-assistant.maxTokens': number;
        'ai-assistant.enabled': boolean;
        'ai-assistant.callsPerMinute': number;
    }
}

const MAX_MESSAGE_LENGTH = 6000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_PROBLEM_CONTENT_LENGTH = 40_000;
const MAX_CODE_LENGTH = 64_000;

function truncate(value: unknown, maxLength: number) {
    const text = typeof value === 'string' ? value : '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}\n\n[truncated]` : text;
}

function sanitizeHistory(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) return [];
    return value.slice(-MAX_HISTORY_MESSAGES).flatMap((item): ChatMessage[] => {
        if (!item || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') return [];
        return [{ role: item.role, content: item.content.slice(0, MAX_MESSAGE_LENGTH) }];
    });
}

/** 仅向提供方发送公开的题目文本以及请求用户自身的提交内容。 */
async function askProvider(messages: ChatMessage[]) {
    const [apiBaseUrl, apiKey, model, maxTokens] = SystemModel.getMany([
        'ai-assistant.apiBaseUrl', 'ai-assistant.apiKey', 'ai-assistant.model', 'ai-assistant.maxTokens',
    ]);
    if (!apiBaseUrl || !apiKey || !model) throw new Error('AI assistant is not configured.');
    const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await superagent.post(endpoint)
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Content-Type', 'application/json')
        .timeout({ response: 15_000, deadline: 30_000 })
        .send({ model, messages, max_tokens: maxTokens, temperature: 0.2 });
    const content = response.body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('AI provider returned an invalid response.');
    return content;
}

abstract class AiHandler extends Handler {
    async prepareAi() {
        this.checkPriv(PRIV.PRIV_USER_PROFILE);
        if (!SystemModel.get('ai-assistant.enabled')) throw new Error('AI assistant is disabled.');
        await OpcountModel.inc('ai-assistant', this.user._id.toString(), 60,
            SystemModel.get('ai-assistant.callsPerMinute'));
    }

    async reply(messages: ChatMessage[]) {
        try {
            this.response.body = { reply: await askProvider(messages) };
        } catch (error) {
            // 请勿向最终用户公开提供商详细信息或凭据。
            // 请仅记录元数据：提示词、代码及服务提供商的响应正文可能包含隐私信息。
            console.warn(`[ai-assistant] provider request failed for user=${this.user._id}`);
            this.response.status = 502;
            this.response.body = { error: 'AI service is temporarily unavailable.' };
        }
    }
}

class AiAskHandler extends AiHandler {
    @param('pid', Types.ProblemId)
    @param('question', Types.String)
    @param('history', true)
    async post(domainId: string, pid: string | number, question: string, history?: unknown) {
        await this.prepareAi();
        if (typeof question !== 'string' || !question.trim()) throw new Error('Question is required.');
        const pdoc = await ProblemModel.get(domainId, pid);
        if (!pdoc) throw new Error('Problem not found.');
        if (!ProblemModel.canViewBy(pdoc, this.user)) throw new Error('Problem is not available.');
        console.info(`[ai-assistant] ask user=${this.user._id} pid=${pdoc.docId}`);
        await this.reply([
            {
                role: 'user',
                content: `You are a programming contest teaching assistant. Help the user understand the public problem statement without revealing hidden tests, official solutions, or final answers.\n\nProblem title: ${pdoc.title}\n\nPublic statement:\n${truncate(pdoc.content, MAX_PROBLEM_CONTENT_LENGTH)}`,
            },
            ...sanitizeHistory(history),
            { role: 'user', content: question.trim().slice(0, MAX_MESSAGE_LENGTH) },
        ]);
    }
}

class AiDebugHandler extends AiHandler {
    @param('rid', Types.ObjectId)
    @param('question', Types.String, true)
    @param('history', true)
    async post(domainId: string, rid: ObjectId, question = '', history?: unknown) {
        await this.prepareAi();
        const rdoc = await RecordModel.get(domainId, rid);
        if (!rdoc) throw new Error('Record not found.');
        // 切勿将其他用户的代码转发给第三方服务商，即使该代码在 Hydro 上可见。
        if (rdoc.uid !== this.user._id) throw new Error('AI debugging is available only for your own submissions.');
        const pdoc = await ProblemModel.get(domainId, rdoc.pid);
        if (!pdoc) throw new Error('Problem not found.');
        if (!ProblemModel.canViewBy(pdoc, this.user)) throw new Error('Problem is not available.');
        console.info(`[ai-assistant] debug user=${this.user._id} rid=${rdoc._id} pid=${pdoc.docId}`);
        await this.reply([
            {
                role: 'user',
                content: `You are a programming contest debugging assistant. Explain likely defects and suggest ways to test or fix them. Do not provide hidden tests, official answers, or claim certainty from a verdict alone.\n\nProblem title: ${pdoc.title}\n\nPublic statement:\n${truncate(pdoc.content, MAX_PROBLEM_CONTENT_LENGTH)}\n\nSubmission language: ${rdoc.lang}\nVerdict: ${rdoc.status}\nScore: ${rdoc.score ?? 'N/A'}\nCompiler messages: ${truncate((rdoc.compilerTexts || []).join('\n'), MAX_MESSAGE_LENGTH)}\n\nUser submission:\n${truncate(rdoc.code, MAX_CODE_LENGTH)}`,
            },
            ...sanitizeHistory(history),
            { role: 'user', content: (question || 'Please help me find what may be wrong with this submission.').slice(0, MAX_MESSAGE_LENGTH) },
        ]);
    }
}

export function apply(ctx: Context) {
    ctx.inject(['i18n'], (c) => {
        c.i18n.load('en', {
            'AI Q&A': 'AI Q&A', 'AI Debug': 'AI Debug', 'Ask AI': 'Ask AI',
            'Send': 'Send', 'AI assistant': 'AI assistant',
        });
        c.i18n.load('zh', {
            'AI Q&A': 'AI 答疑', 'AI Debug': 'AI 改错', 'Ask AI': '向 AI 提问',
            'Send': '发送', 'AI assistant': 'AI 助手',
        });
    });
    ctx.setting.SystemSetting(Schema.object({
        'ai-assistant': Schema.object({
            apiBaseUrl: Schema.string().role('url').description('OpenAI-compatible API Base URL').default(''),
            apiKey: Schema.string().role('password').description('AI provider API key').default(''),
            model: Schema.string().description('AI model name').default(''),
            maxTokens: Schema.number().min(64).max(8192).description('Maximum tokens per reply').default(1024),
            enabled: Schema.boolean().description('Enable AI assistant for ordinary users').default(false),
            callsPerMinute: Schema.number().min(1).max(60).description('Per-user AI requests per minute').default(6),
        }),
    }));
    ctx.Route('ai_ask', '/ai/ask', AiAskHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('ai_debug', '/ai/debug', AiDebugHandler, PRIV.PRIV_USER_PROFILE);
}
