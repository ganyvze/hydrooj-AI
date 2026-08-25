import {
    Context, Handler, OpcountModel, PERM, PRIV, ProblemModel, RecordModel,
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

function sanitizeHistory(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) return [];
    return value.slice(-MAX_HISTORY_MESSAGES).flatMap((item): ChatMessage[] => {
        if (!item || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') return [];
        return [{ role: item.role, content: item.content.slice(0, MAX_MESSAGE_LENGTH) }];
    });
}

/** Sends only public problem text and the requesting user's own submission to the provider. */
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
            // Do not expose provider details or credentials to end users.
            // Keep the log metadata-only: prompts, code and provider response bodies may be private.
            console.warn(`[ai-assistant] provider request failed for user=${this.user._id}`);
            this.response.status = 502;
            this.response.body = { error: 'AI service is temporarily unavailable.' };
        }
    }
}

class AiAskHandler extends AiHandler {
    @param('pid', Types.ProblemId)
    @param('question', Types.String)
    async post(domainId: string, pid: string | number, question: string, history?: unknown) {
        await this.prepareAi();
        if (typeof question !== 'string' || !question.trim()) throw new Error('Question is required.');
        const pdoc = await ProblemModel.get(domainId, pid);
        if (!pdoc) throw new Error('Problem not found.');
        if (pdoc.hidden && !this.user.hasPerm(PERM.PERM_VIEW_PROBLEM_HIDDEN)) throw new Error('Problem is not available.');
        console.info(`[ai-assistant] ask user=${this.user._id} pid=${pdoc.docId}`);
        await this.reply([
            {
                role: 'user',
                content: `You are a programming contest teaching assistant. Help the user understand the public problem statement without revealing hidden tests, official solutions, or final answers.\n\nProblem title: ${pdoc.title}\n\nPublic statement:\n${pdoc.content || ''}`,
            },
            ...sanitizeHistory(history),
            { role: 'user', content: question.trim().slice(0, MAX_MESSAGE_LENGTH) },
        ]);
    }
}

class AiDebugHandler extends AiHandler {
    @param('rid', Types.ObjectId)
    @param('question', Types.String, true)
    async post(domainId: string, rid: ObjectId, question = '', history?: unknown) {
        await this.prepareAi();
        const rdoc = await RecordModel.get(domainId, rid);
        if (!rdoc) throw new Error('Record not found.');
        // Never forward another user's code to a third-party provider, even if it is viewable on Hydro.
        if (rdoc.uid !== this.user._id) throw new Error('AI debugging is available only for your own submissions.');
        const pdoc = await ProblemModel.get(domainId, rdoc.pid);
        if (!pdoc) throw new Error('Problem not found.');
        console.info(`[ai-assistant] debug user=${this.user._id} rid=${rdoc._id} pid=${pdoc.docId}`);
        await this.reply([
            {
                role: 'user',
                content: `You are a programming contest debugging assistant. Explain likely defects and suggest ways to test or fix them. Do not provide hidden tests, official answers, or claim certainty from a verdict alone.\n\nProblem title: ${pdoc.title}\n\nPublic statement:\n${pdoc.content || ''}\n\nSubmission language: ${rdoc.lang}\nVerdict: ${rdoc.status}\nScore: ${rdoc.score ?? 'N/A'}\nCompiler messages: ${(rdoc.compilerTexts || []).join('\n')}\n\nUser submission:\n${rdoc.code || ''}`,
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
