## HydroOJ AI 插件

### 简介

* 为 HydroOJ 提供 AI 助手能力（当前版本先完成控制面板设置项的注册与存储）
* 配置独立存储在插件自己的数据库集合（`ai.config`）中，不依赖 HydroOJ 的全局系统设置（`ctx.setting.SystemSetting`）
* 管理页面 route：`/manage/ai`，默认权限为 `PRIV_MANAGE_ALL_DOMAIN`，另见控制面板「AI 管理」

### 安装

```bash
cd /root/.hydro/addons
git clone https://github.com/ganyvze/hydrooj-AI
hydrooj addon add /root/.hydro/addons/hydrooj-AI
pm2 restart hydrooj
```

一键安装：

```bash
cd /root/.hydro/addons && git clone https://github.com/ganyvze/hydrooj-AI && hydrooj addon add /root/.hydro/addons/hydrooj-AI && pm2 restart hydrooj
```

### 后台可配置项

* **开启 AI 功能**：总开关，默认关闭
* **API 基础 URL**：OpenAI 兼容的 API 基础 URL，例如 `https://api.openai.com/v1`
* **API 密钥**：保存后表单不回显；留空保存则保留已保存的密钥
* **模型**：模型名称，例如 `gpt-4o-mini`
* **系统提示词**：会被添加到每次对话的开头
* **温度**：采样温度，0 - 2
* **最大回复 Token 数**
* **限流次数 / 限流窗口（分钟）**：窗口期内每位用户的最大调用次数
* **请求超时（秒）**

### 其他

* 配置读写通过 `global.Hydro.model.ai`（`getConfig` / `saveConfig`）访问，后续 AI 功能（答疑、改错等）将基于此配置实现
