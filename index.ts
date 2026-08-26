import {
    Context, Handler, param, PRIV, PERM, STATUS, Types,
} from 'hydrooj';
import { AiConfig } from './model';

const AiModel = global.Hydro.model.ai;
const ProblemModel = (global.Hydro.model as any).problem;
const RecordModel = (global.Hydro.model as any).record;
const StorageModel = (global.Hydro.model as any).storage;

const STATUS_TEXT: Record<number, string> = {
    [STATUS.STATUS_WAITING]: '等待评测 (Waiting)',
    [STATUS.STATUS_JUDGING]: '正在评测 (Judging)',
    [STATUS.STATUS_ACCEPTED]: '通过 (Accepted)',
    [STATUS.STATUS_WRONG_ANSWER]: '答案错误 (Wrong Answer / WA)',
    [STATUS.STATUS_TIME_LIMIT_EXCEEDED]: '超出时间限制 (Time Limit Exceeded / TLE)',
    [STATUS.STATUS_MEMORY_LIMIT_EXCEEDED]: '超出空间限制 (Memory Limit Exceeded / MLE)',
    [STATUS.STATUS_RUNTIME_ERROR]: '运行时错误 (Runtime Error / RE)',
    [STATUS.STATUS_COMPILE_ERROR]: '编译错误 (Compile Error / CE)',
    [STATUS.STATUS_SYSTEM_ERROR]: '系统错误 (System Error / SE)',
    [STATUS.STATUS_CANCELED]: '评测已取消 (Canceled)',
    [STATUS.STATUS_ETC]: '其他错误 (ETC)',
};

// 辅助函数：多策略获取题目详情
async function fetchProblemDoc(ctx: Context, domain: string, pid: string | number) {
    if (!pid) return null;
    try {
        let pdoc = await ProblemModel.get(domain, pid, true);
        if (!pdoc && typeof pid === 'string' && /^\d+$/.test(pid)) {
            pdoc = await ProblemModel.get(domain, +pid, true);
        }
        if (!pdoc && typeof pid === 'number') {
            pdoc = await ProblemModel.get(domain, String(pid), true);
        }
        if (!pdoc) {
            const numPid = Number(pid);
            const query: any = {
                $or: [
                    { pid: String(pid) },
                    { docId: isNaN(numPid) ? pid : numPid },
                    { pid: isNaN(numPid) ? pid : numPid },
                ],
            };
            if (domain && domain !== 'system') {
                pdoc = await ctx.db.collection('problem').findOne({ domainId: domain, ...query });
            }
            if (!pdoc) {
                pdoc = await ctx.db.collection('problem').findOne(query);
            }
        }
        return pdoc;
    } catch (e) {
        return null;
    }
}

// 辅助函数：从 MongoDB 或 Storage 提取提交的代码
async function fetchRecordCode(rdoc: any): Promise<string> {
    if (!rdoc) return '';
    if (rdoc.code && typeof rdoc.code === 'string') {
        return rdoc.code;
    }
    if (rdoc.files?.code && StorageModel?.get) {
        try {
            const [fileId] = String(rdoc.files.code).split('#');
            if (fileId) {
                const streamOrBuf = await StorageModel.get(`submission/${fileId}`);
                if (Buffer.isBuffer(streamOrBuf)) {
                    return streamOrBuf.toString('utf-8');
                } else if (streamOrBuf && typeof (streamOrBuf as any).read === 'function') {
                    const chunks: Buffer[] = [];
                    for await (const chunk of streamOrBuf) {
                        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                    }
                    return Buffer.concat(chunks).toString('utf-8');
                }
            }
        } catch (e) {
            // ignore
        }
    }
    return '';
}

class AiManageHandler extends Handler {
    async get() {
        const config = await AiModel.getConfig(this.ctx);
        this.response.template = 'ai_manage.html';
        this.response.body = { config };
    }

    @param('enabled', Types.Boolean)
    @param('apiUrl', Types.String, true)
    @param('apiKey', Types.String, true)
    @param('model', Types.String, true)
    @param('systemPrompt', Types.Content, true)
    @param('temperature', Types.Float, true)
    @param('maxTokens', Types.PositiveInt, true)
    @param('rateLimit', Types.PositiveInt, true)
    @param('rateLimitWindow', Types.PositiveInt, true)
    @param('timeout', Types.PositiveInt, true)
    async postSave(
        _: string,
        enabled = false,
        apiUrl = '',
        apiKey = '',
        model = '',
        systemPrompt = '',
        temperature = 0.7,
        maxTokens = 1024,
        rateLimit = 5,
        rateLimitWindow = 10,
        timeout = 60,
    ) {
        const patch: Partial<AiConfig> = {
            enabled,
            apiUrl: apiUrl.trim().replace(/\/+$/, ''),
            model: model.trim(),
            systemPrompt,
            temperature: Math.min(Math.max(temperature, 0), 2),
            maxTokens: Math.min(Math.max(maxTokens, 1), 128000),
            rateLimit: Math.max(rateLimit, 1),
            rateLimitWindow: Math.max(rateLimitWindow, 1),
            timeout: Math.min(Math.max(timeout, 1), 600),
        };
        if (apiKey.trim()) patch.apiKey = apiKey.trim();
        await AiModel.saveConfig(this.ctx, patch);
        this.response.redirect = this.url('ai_manage');
    }
}

class AiChatHandler extends Handler {
    async post(domainId: string) {
        const body = (this.request.body || {}) as {
            messages?: Array<{ role: string; content: string }>;
            contextType?: 'problem' | 'record';
            pid?: string | number;
            rid?: string;
            domainId?: string;
            fallbackTitle?: string;
            fallbackContent?: string;
            fallbackCode?: string;
        };

        if (!this.user._id) {
            this.response.status = 401;
            this.response.body = { error: '请先登录后再使用 AI 助手功能' };
            return;
        }

        const config = await AiModel.getConfig(this.ctx);
        if (!config.enabled) {
            this.response.status = 403;
            this.response.body = { error: 'AI 助手功能已被管理员关闭' };
            return;
        }

        if (!config.apiKey) {
            this.response.status = 500;
            this.response.body = { error: '系统尚未配置 AI API Key，请联系管理员在后台设置' };
            return;
        }

        // 限流检查
        const limitCheck = await AiModel.checkRateLimit(this.ctx, this.user._id, config);
        if (!limitCheck.ok) {
            this.response.status = 429;
            this.response.body = {
                error: `调用过于频繁，请在 ${limitCheck.waitSeconds} 秒后再试（限流规则: ${config.rateLimit} 次 / ${config.rateLimitWindow} 分钟）`,
            };
            return;
        }

        const domain = domainId || body.domainId || 'system';
        let contextPrompt = '';

        // 装配上下文
        try {
            if (body.contextType === 'record' && body.rid) {
                const rid = Types.ObjectId(body.rid);
                const rdoc = await RecordModel.get(domain, rid);
                if (rdoc && (rdoc.uid === this.user._id || this.user.hasPerm(PERM.PERM_VIEW_RECORD))) {
                    const pdoc = await fetchProblemDoc(this.ctx, domain, rdoc.pid);
                    const userCode = (await fetchRecordCode(rdoc)) || body.fallbackCode || '';
                    const problemTitle = pdoc?.title || body.fallbackTitle || rdoc.pid;
                    const problemContent = pdoc?.content || body.fallbackContent || '';
                    const statusStr = STATUS_TEXT[rdoc.status] || `状态码 ${rdoc.status}`;

                    contextPrompt = `
========================================
【当前上下文：用户提交的代码排查】
- 题目 PID: ${rdoc.pid}
- 题目标题: ${problemTitle}
- 评测状态: ${statusStr}
- 评测得分: ${rdoc.score ?? 0}
- 编程语言: ${rdoc.lang}
- 耗时: ${rdoc.time || 0} ms, 内存: ${rdoc.memory || 0} KB
${rdoc.compilerText ? `\n【编译器报错信息/提示】:\n\`\`\`\n${rdoc.compilerText.slice(0, 2000)}\n\`\`\`` : ''}
${rdoc.judgeTexts && Object.keys(rdoc.judgeTexts).length > 0 ? `\n【评测点提示】:\n${JSON.stringify(rdoc.judgeTexts).slice(0, 1000)}` : ''}
\n【用户提交的代码】:
\`\`\`${rdoc.lang || 'cpp'}
${userCode ? userCode.slice(0, 6000) : '(未获取到用户代码)'}
\`\`\`
${problemContent ? `\n【题面描述与约束】:\n时间限制: ${pdoc?.time || 1000}ms, 空间限制: ${pdoc?.memory || 262144}KB\n${problemContent.slice(0, 3000)}` : ''}
========================================
`;
                }
            } else if (body.pid) {
                const pdoc = await fetchProblemDoc(this.ctx, domain, body.pid);
                const title = pdoc?.title || body.fallbackTitle || body.pid;
                const content = pdoc?.content || body.fallbackContent || '';

                contextPrompt = `
========================================
【当前上下文：题目详情】
- 题目 PID: ${body.pid}
- 题目标题: ${title}
- 时间限制: ${pdoc?.time || 1000} ms, 空间限制: ${pdoc?.memory || 262144} KB
- 题目描述与约束:
${content ? content.slice(0, 5000) : '(题面信息见上方标题)'}
========================================
`;
            }
        } catch (e) {
            // ignore
        }

        const systemMessage = {
            role: 'system',
            content: `${config.systemPrompt || '你是一个专业的算法竞赛助教。'}\n\n${contextPrompt}\n\n【核心规则】：
1. 用户的提问是针对上方给出的题目与代码上下文进行的，请直接结合上下文解答用户的疑问，严禁再要求用户粘贴题目或代码！
2. 遵循启发式教学：重点分析算法核心思想、时间/空间复杂度、边界特判或代码逻辑漏洞，严禁直接提供可直接 AC 的完整代码！`,
        };

        const userHistory = (body.messages || [])
            .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
            .slice(-8)
            .map((m) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content.trim(),
            }));

        const openaiMessages = [systemMessage, ...userHistory];

        // 启动 SSE 流式响应
        const koaCtx = (this as any).context;
        koaCtx.status = 200;
        koaCtx.set({
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        if (typeof koaCtx.flushHeaders === 'function') {
            koaCtx.flushHeaders();
        }
        koaCtx.respond = false;

        const res = koaCtx.res;
        const abortController = new AbortController();

        res.on('close', () => {
            if (!res.writableEnded) {
                abortController.abort();
            }
        });

        try {
            let baseUrl = (config.apiUrl || '').trim().replace(/\/+$/, '');
            if (baseUrl.endsWith('/chat/completions')) {
                baseUrl = baseUrl.slice(0, -'/chat/completions'.length).replace(/\/+$/, '');
            }
            const apiUrl = `${baseUrl}/chat/completions`;

            const timeoutSignal = AbortSignal.timeout((config.timeout || 60) * 1000);
            timeoutSignal.addEventListener('abort', () => abortController.abort(), { once: true });

            const upstreamRes = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.model || 'glm-4-flash',
                    messages: openaiMessages,
                    temperature: config.temperature ?? 0.7,
                    max_tokens: config.maxTokens ?? 1024,
                    stream: true,
                }),
                signal: abortController.signal,
            });

            if (!upstreamRes.ok) {
                const errText = await upstreamRes.text();
                res.write(`data: ${JSON.stringify({ error: `上游 AI 返回异常 (${upstreamRes.status}): ${errText}` })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            if (!upstreamRes.body) {
                res.write(`data: ${JSON.stringify({ error: '上游 AI 服务未返回数据流' })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            const reader = upstreamRes.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith(':')) continue;
                    if (trimmed === 'data: [DONE]') {
                        res.write('data: [DONE]\n\n');
                        continue;
                    }
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const parsed = JSON.parse(trimmed.slice(6));
                            const delta = parsed.choices?.[0]?.delta?.content || '';
                            if (delta) {
                                res.write(`data: ${JSON.stringify({ delta })}\n\n`);
                            }
                        } catch {
                            // ignore
                        }
                    }
                }
            }

            res.write('data: [DONE]\n\n');
            res.end();
        } catch (err: any) {
            if (err.name === 'AbortError' && !res.writableEnded) {
                res.end();
                return;
            }
            if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ error: `请求异常: ${err.message || String(err)}` })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            }
        }
    }
}

export async function apply(ctx: Context) {
    ctx.Route('ai_manage', '/manage/ai', AiManageHandler, PRIV.PRIV_MANAGE_ALL_DOMAIN);
    ctx.Route('ai_chat', '/api/ai/chat', AiChatHandler);
    ctx.injectUI('ControlPanel', 'ai_manage');

    ctx.on('handler/after/ProblemDetail#get', async (that) => {
        const config = await AiModel.getConfig(ctx);
        if (!config.enabled) return;
        if (!that.user._id) return;
        that.UiContext.showAiFloatButton = true;
        that.UiContext.aiContext = {
            type: 'problem',
            pid: that.pdoc?.pid || that.pdoc?.docId || that.args?.pid,
            title: that.pdoc?.title || '',
            domainId: that.domainId || that.args?.domainId || 'system',
        };
    });

    ctx.on('handler/after/RecordDetail#get', async (that) => {
        const config = await AiModel.getConfig(ctx);
        if (!config.enabled) return;
        const rdoc = that.rdoc;
        if (!rdoc) return;
        if (rdoc.uid !== that.user._id) return;
        if ([STATUS.STATUS_ACCEPTED, STATUS.STATUS_SYSTEM_ERROR].includes(rdoc.status)) return;
        that.UiContext.showAiFloatButton = true;
        that.UiContext.aiContext = {
            type: 'record',
            pid: rdoc.pid,
            rid: rdoc._id?.toString(),
            domainId: that.domainId || that.args?.domainId || 'system',
        };
    });

    ctx.i18n.load('zh', {
        ai_manage: 'AI 管理',
        'AI Settings': 'AI 设置',
        'Enable AI features': '开启 AI 功能',
        'API Base URL': 'API 基础 URL',
        'OpenAI-compatible API base URL, e.g. https://api.openai.com/v1': 'OpenAI 兼容的 API 基础 URL，例如 https://api.openai.com/v1',
        'API Key': 'API 密钥',
        'Leave empty to keep the saved key': '留空则保留已保存的密钥',
        'Key saved': '密钥已保存',
        'No key saved': '尚未保存密钥',
        Model: '模型',
        'Model name, e.g. gpt-4o-mini': '模型名称，例如 gpt-4o-mini',
        'System prompt': '系统提示词',
        'Prepended to every conversation': '会被添加到每次对话的开头',
        Temperature: '温度（Temperature）',
        'Sampling temperature, 0 - 2': '采样温度，0 - 2',
        'Max tokens': '最大回复 Token 数',
        'Rate limit': '限流次数',
        'Max calls per user within the window': '窗口期内每位用户的最大调用次数',
        'Rate limit window (minutes)': '限流窗口（分钟）',
        'Timeout (seconds)': '请求超时（秒）',
        Save: '保存',
    });
}