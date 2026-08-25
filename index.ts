import {
    Context, Handler, param, PRIV, STATUS, Types,
} from 'hydrooj';
import { AiConfig } from './model';

const AiModel = global.Hydro.model.ai;

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
        // Keep the stored key when the field is left empty, so that
        // saving other settings doesn't wipe the credential.
        if (apiKey.trim()) patch.apiKey = apiKey.trim();
        await AiModel.saveConfig(this.ctx, patch);
        this.response.redirect = this.url('ai_manage');
    }
}

export async function apply(ctx: Context) {
    ctx.Route('ai_manage', '/manage/ai', AiManageHandler, PRIV.PRIV_MANAGE_ALL_DOMAIN);
    ctx.injectUI('ControlPanel', 'ai_manage');

    // Show the AI float ball on problem detail pages.
    ctx.on('handler/after/ProblemDetail#get', async (that) => {
        const config = await AiModel.getConfig(ctx);
        if (!config.enabled) return;
        if (!that.user._id) return;
        that.UiContext.showAiFloatButton = true;
    });

    // Show the AI float ball on the user's own record pages,
    // except for Accepted and System Error submissions.
    ctx.on('handler/after/RecordDetail#get', async (that) => {
        const config = await AiModel.getConfig(ctx);
        if (!config.enabled) return;
        const rdoc = that.rdoc;
        if (!rdoc) return;
        if (rdoc.uid !== that.user._id) return;
        if ([STATUS.STATUS_ACCEPTED, STATUS.STATUS_SYSTEM_ERROR].includes(rdoc.status)) return;
        that.UiContext.showAiFloatButton = true;
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
    ctx.i18n.load('en', {
        ai_manage: 'AI Manage',
        'AI Settings': 'AI Settings',
        'Enable AI features': 'Enable AI features',
        'API Base URL': 'API Base URL',
        'OpenAI-compatible API base URL, e.g. https://api.openai.com/v1': 'OpenAI-compatible API base URL, e.g. https://api.openai.com/v1',
        'API Key': 'API Key',
        'Leave empty to keep the saved key': 'Leave empty to keep the saved key',
        'Key saved': 'Key saved',
        'No key saved': 'No key saved',
        Model: 'Model',
        'Model name, e.g. gpt-4o-mini': 'Model name, e.g. gpt-4o-mini',
        'System prompt': 'System prompt',
        'Prepended to every conversation': 'Prepended to every conversation',
        Temperature: 'Temperature',
        'Sampling temperature, 0 - 2': 'Sampling temperature, 0 - 2',
        'Max tokens': 'Max tokens',
        'Rate limit': 'Rate limit',
        'Max calls per user within the window': 'Max calls per user within the window',
        'Rate limit window (minutes)': 'Rate limit window (minutes)',
        'Timeout (seconds)': 'Timeout (seconds)',
        Save: 'Save',
    });
}
