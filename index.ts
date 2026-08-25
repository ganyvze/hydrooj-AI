import { Context, Schema } from 'koishi';
import {
    ConnectionHandler, OpcountModel, ProblemModel, RecordModel,
    requireCodePerm, requireUser, setting, UserFacingError
} from 'hydrooj';

export const name = 'AI';

export function apply(ctx: Context) {
    // 1. 注册系统设置
    ctx.setting.SystemSetting(Schema.object({
        ai_assistant: Schema.object({
            enabled: Schema.boolean().description('是否开启 AI 助手').default(true),
            apiUrl: Schema.string().description('OpenAI 兼容的 API Base URL').role('url').default('https://api.openai.com/v1/chat/completions'),
            apiKey: Schema.string().description('API Key').role('password').default(''),
            model: Schema.string().description('模型名称').default('gpt-3.5-turbo'),
            maxTokens: Schema.number().description('最大回复 Token 数').default(1024),
            rateLimit: Schema.number().description('每位用户每 10 分钟最大调用次数').default(5),
        }).description('AI 助手设置'),
    }));

    // 2. 注册国际化文案
    ctx.i18n.load('zh', {
        'AI Assistant': 'AI 答疑',
        'AI Debug': 'AI 改错',
        'Ask AI': '向 AI 提问...',
        'Rate limit exceeded': '调用太频繁，请稍后再试',
        'AI feature is disabled': 'AI 助手当前未开启',
    });
    ctx.i18n.load('en', {
        'AI Assistant': 'AI Assistant',
        'AI Debug': 'AI Debug',
        'Ask AI': 'Ask AI...',
        'Rate limit exceeded': 'Rate limit exceeded, please try again later',
        'AI feature is disabled': 'AI Assistant is currently disabled',
    });

    // 3. 注册 WebSocket 处理器
    ctx.Connection('ai_chat_conn', '/ai/chat-conn', AiChatConnectionHandler);
}

class AiChatConnectionHandler extends ConnectionHandler {
    async message(msg: string) {
        const payload = JSON.parse(msg);
        const { type, id, question, history = [] } = payload;
        
        try {
            await requireUser(this.request);
            const user = this.user;
            const config = setting.ai_assistant;

            if (!config.enabled) throw new UserFacingError('AI feature is disabled');

            // 限流控制: 10分钟内最多 N 次
            const opcount = await OpcountModel.inc(user._id, 'ai_chat', 10 * 60);
            if (opcount > config.rateLimit) {
                throw new UserFacingError('Rate limit exceeded');
            }

            let systemPrompt = '';

            if (type === 'ask') {
                // AI 答疑
                const pdoc = await ProblemModel.get(setting.DOMAIN_ID, id);
                if (!pdoc) throw new UserFacingError('Problem not found');
                
                // 注意隐私与安全：只提取公开的描述信息
                systemPrompt = `你是一个算法竞赛助教。当前学生正在看题目《${pdoc.title}》。
题目描述：${pdoc.content}
请仅就题目理解和思路提供帮助，绝对不要直接提供完整代码或测试用例。`;

            } else if (type === 'debug') {
                // AI 改错
                const rdoc = await RecordModel.get(setting.DOMAIN_ID, id);
                if (!rdoc) throw new UserFacingError('Record not found');
                
                // 权限校验：只允许看自己代码或具有查看代码权限的用户
                await requireCodePerm(this.request, rdoc);
                
                const pdoc = await ProblemModel.get(setting.DOMAIN_ID, rdoc.pid);
                const code = rdoc.code || '';
                const compilerText = rdoc.compilerTexts?.join('\n') || '';

                systemPrompt = `你是一个算法竞赛助教。学生提交了题目《${pdoc?.title || '未知'}》的代码。
评测状态：${rdoc.status}，得分：${rdoc.score}
编译/错误信息：${compilerText}
学生的代码（语言：${rdoc.lang}）：
\`\`\`
${code}
\`\`\`
请找出代码中的错误并给出提示，不要直接给出重写后的完整代码。`;
            }

            // 构造 API 请求消息体
            const messages = [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: question }
            ];

            // 调用外部 LLM 并流式返回
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages,
                    max_tokens: config.maxTokens,
                    stream: true, // 开启流式
                })
            });

            if (!response.ok) {
                const err = await response.json();
                this.send({ error: err.error?.message || 'LLM API Error' });
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    this.send({ done: true });
                    break;
                }
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    const message = line.replace(/^data: /, '');
                    if (message === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(message);
                        const token = parsed.choices[0]?.delta?.content || '';
                        if (token) this.send({ token });
                    } catch (e) {
                        // 忽略不完整数据块的解析错误
                    }
                }
            }
        } catch (err) {
            this.send({ error: err.message || 'Unknown error' });
        }
    }
}