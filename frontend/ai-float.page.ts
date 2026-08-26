import { addPage, NamedPage } from '@hydrooj/ui-default';

declare const UiContext: Record<string, any>;

const BALL_SIZE = 52;
const EDGE_MARGIN = 8;

const css = `
/* ==================== 悬浮球样式 ==================== */
.ai-float-ball {
  position: fixed;
  z-index: 9990;
  width: ${BALL_SIZE}px;
  height: ${BALL_SIZE}px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  cursor: grab;
  user-select: none;
  touch-action: none;
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background-color 0.2s ease;
}
.ai-float-ball:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
}
.ai-float-ball:active {
  cursor: grabbing;
  transform: scale(0.96);
}
.ai-float-ball.active {
  background: #1d4ed8;
}

/* ==================== 遮罩层 ==================== */
.ai-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  z-index: 9998;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.ai-drawer-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

/* ==================== 侧边栏容器 ==================== */
.ai-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 440px;
  max-width: 100vw;
  height: 100vh;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #1f2937;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
  transform: translateX(100%);
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-sizing: border-box;
}
.ai-sidebar * {
  box-sizing: border-box;
}
.ai-sidebar.open {
  transform: translateX(0);
}

/* ==================== 侧边栏头部 ==================== */
.ai-header {
  height: 60px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  flex-shrink: 0;
}
.ai-header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ai-avatar-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.ai-title-wrap {
  display: flex;
  flex-direction: column;
}
.ai-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
}
.ai-status {
  font-size: 11px;
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}
.ai-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}
.ai-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ai-btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: background 0.15s ease, color 0.15s ease;
}
.ai-btn-icon:hover {
  background: #f3f4f6;
  color: #111827;
}

/* ==================== 消息滚动区域 ==================== */
.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
}

.ai-body::-webkit-scrollbar {
  width: 6px;
}
.ai-body::-webkit-scrollbar-track {
  background: transparent;
}
.ai-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}
.ai-body::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 欢迎卡片 */
.ai-welcome-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}
.ai-welcome-card h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ai-prompts-group {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ai-prompt-chip {
  padding: 6px 10px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  font-size: 12px;
  color: #2563eb;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.ai-prompt-chip:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

/* 消息项 */
.ai-msg {
  display: flex;
  gap: 10px;
  max-width: 100%;
}
.ai-msg.user {
  flex-direction: row-reverse;
}
.ai-msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
}
.ai-msg.assistant .ai-msg-avatar {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
}
.ai-msg.user .ai-msg-avatar {
  background: #3b82f6;
  color: #fff;
}
.ai-msg-content-wrap {
  display: flex;
  flex-direction: column;
  max-width: calc(100% - 40px);
}
.ai-msg.user .ai-msg-content-wrap {
  align-items: flex-end;
}
.ai-msg-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  line-height: 1.6;
  word-break: break-word;
}
.ai-msg.assistant .ai-msg-bubble {
  background: #f3f4f6;
  color: #1f2937;
  border-top-left-radius: 2px;
}
.ai-msg.user .ai-msg-bubble {
  background: #2563eb;
  color: #ffffff;
  border-top-right-radius: 2px;
  white-space: pre-wrap;
}

/* Markdown 与代码块样式 */
.ai-msg-bubble h3, .ai-msg-bubble h4, .ai-msg-bubble h5 {
  margin: 8px 0 4px 0;
  font-weight: 600;
}
.ai-msg-bubble p {
  margin: 4px 0;
}
.ai-inline-code {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 5px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  color: #b91c1c;
}
.ai-code-block {
  background: #1e293b;
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
  color: #f8fafc;
}
.ai-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 10px;
  background: #0f172a;
  color: #94a3b8;
  font-size: 11px;
}
.ai-code-block pre {
  margin: 0;
  padding: 10px 12px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.45;
}
.ai-copy-btn {
  border: none;
  background: #334155;
  color: #e2e8f0;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}
.ai-copy-btn:hover {
  background: #475569;
}
.ai-quote {
  border-left: 3px solid #3b82f6;
  margin: 6px 0;
  padding-left: 8px;
  color: #4b5563;
}
.ai-list-item {
  margin-left: 18px;
  list-style-type: disc;
}

/* ==================== 底部输入区域 ==================== */
.ai-footer {
  padding: 12px 16px 14px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
  flex-shrink: 0;
}
.ai-input-box {
  display: flex;
  align-items: flex-end;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 8px 10px;
  gap: 8px;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
}
.ai-input-box:focus-within {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.ai-textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-size: 13.5px;
  line-height: 1.5;
  color: #1f2937;
  max-height: 120px;
  min-height: 24px;
  height: 24px;
  padding: 0;
  font-family: inherit;
}
.ai-send-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, opacity 0.15s ease;
}
.ai-send-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}
.ai-send-btn.stop {
  background: #ef4444 !important;
  opacity: 1 !important;
  cursor: pointer !important;
}
.ai-send-btn:not(:disabled):hover {
  background: #1d4ed8;
}
.ai-footer-hint {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 6px;
  text-align: right;
}

/* ==================== 暗黑主题适配 (.theme--dark) ==================== */
.theme--dark .ai-float-ball {
  background: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
}
.theme--dark .ai-drawer-backdrop {
  background: rgba(0, 0, 0, 0.6);
}
.theme--dark .ai-sidebar {
  background: #18181b;
  color: #f4f4f5;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
}
.theme--dark .ai-header {
  background: #18181b;
  border-bottom-color: #27272a;
}
.theme--dark .ai-title {
  color: #f4f4f5;
}
.theme--dark .ai-btn-icon {
  color: #a1a1aa;
}
.theme--dark .ai-btn-icon:hover {
  background: #27272a;
  color: #ffffff;
}
.theme--dark .ai-body::-webkit-scrollbar-thumb {
  background: #3f3f46;
}
.theme--dark .ai-body::-webkit-scrollbar-thumb:hover {
  background: #52525b;
}
.theme--dark .ai-welcome-card {
  background: #27272a;
  border-color: #3f3f46;
  color: #d4d4d8;
}
.theme--dark .ai-welcome-card h4 {
  color: #f4f4f5;
}
.theme--dark .ai-prompt-chip {
  background: #18181b;
  border-color: #3f3f46;
  color: #60a5fa;
}
.theme--dark .ai-prompt-chip:hover {
  background: #27272a;
  border-color: #60a5fa;
}
.theme--dark .ai-msg.assistant .ai-msg-avatar {
  background: #1e3a8a;
  color: #93c5fd;
  border-color: #1e40af;
}
.theme--dark .ai-msg.assistant .ai-msg-bubble {
  background: #27272a;
  color: #f4f4f5;
}
.theme--dark .ai-inline-code {
  background: rgba(255, 255, 255, 0.12);
  color: #fca5a5;
}
.theme--dark .ai-quote {
  color: #9ca3af;
  border-left-color: #60a5fa;
}
.theme--dark .ai-footer {
  background: #18181b;
  border-top-color: #27272a;
}
.theme--dark .ai-input-box {
  background: #27272a;
  border-color: #3f3f46;
}
.theme--dark .ai-input-box:focus-within {
  background: #18181b;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.theme--dark .ai-textarea {
  color: #f4f4f5;
}
.theme--dark .ai-footer-hint {
  color: #71717a;
}
`;

const ICONS = {
  robot: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
  sparkle: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
  user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
  stop: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect width="14" height="14" x="5" y="5" rx="2"/></svg>`,
};

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(raw: string): string {
  if (!raw) return '';
  const codeBlocks: string[] = [];

  let text = raw.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const index = codeBlocks.length;
    const safeCode = escapeHtml(code.trimEnd());
    const langLabel = escapeHtml(lang || 'code');
    const blockHtml = `
<div class="ai-code-block">
  <div class="ai-code-header">
    <span>${langLabel}</span>
    <button class="ai-copy-btn" data-code="${encodeURIComponent(code.trimEnd())}">复制</button>
  </div>
  <pre><code>${safeCode}</code></pre>
</div>`;
    codeBlocks.push(blockHtml);
    return `__CODE_BLOCK_${index}__`;
  });

  text = escapeHtml(text);
  text = text.replace(/`([^`\n]+)`/g, '<code class="ai-inline-code">$1</code>');
  text = text.replace(/^### (.*$)/gim, '<h5>$1</h5>');
  text = text.replace(/^## (.*$)/gim, '<h4>$1</h4>');
  text = text.replace(/^# (.*$)/gim, '<h3>$1</h3>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/^> (.*$)/gim, '<blockquote class="ai-quote">$1</blockquote>');
  text = text.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ai-list-item">$1</li>');
  text = text.replace(/\n/g, '<br/>');
  text = text.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)] || '');

  return text;
}

function setupAiAssistantUI() {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const aiCtx = UiContext.aiContext || { type: 'problem' };
  const isRecordPage = aiCtx.type === 'record';

  const welcomePrompts = isRecordPage
    ? `
      <div class="ai-prompt-chip" data-prompt="请帮我分析这份代码哪里可能存在逻辑漏洞或边界问题？">🐞 分析代码疑点</div>
      <div class="ai-prompt-chip" data-prompt="针对当前未通过的状态，有什么推荐的调试排查方向？">🔍 调试排查建议</div>
      <div class="ai-prompt-chip" data-prompt="如何优化当前代码的时间或空间复杂度？">⚡ 复杂度优化提示</div>
    `
    : `
      <div class="ai-prompt-chip" data-prompt="请用通俗的语言解释这道题目的核心含义与输入约束。">💡 解释题目意思</div>
      <div class="ai-prompt-chip" data-prompt="这道题有什么解题思路？可以给一些关键算法方向的提示吗？">🎯 解题思路提示</div>
      <div class="ai-prompt-chip" data-prompt="如何分析这道题的数据规模与时空复杂度？">⚡ 复杂度分析</div>
      <div class="ai-prompt-chip" data-prompt="这道题有哪些容易遗漏的特殊边界情况？">⚠️ 边界特判提醒</div>
    `;

  const backdrop = document.createElement('div');
  backdrop.className = 'ai-drawer-backdrop';

  const sidebar = document.createElement('div');
  sidebar.className = 'ai-sidebar';
  sidebar.innerHTML = `
    <div class="ai-header">
      <div class="ai-header-info">
        <div class="ai-avatar-icon">${ICONS.robot}</div>
        <div class="ai-title-wrap">
          <span class="ai-title">AI</span>
          <span class="ai-status"><span class="ai-status-dot"></span>已连接</span>
        </div>
      </div>
      <div class="ai-header-actions">
        <button class="ai-btn-icon" id="ai-clear-btn" title="清空对话">${ICONS.trash}</button>
        <button class="ai-btn-icon" id="ai-close-btn" title="关闭">${ICONS.close}</button>
      </div>
    </div>
    <div class="ai-body" id="ai-body">
      <div class="ai-welcome-card" id="ai-welcome">
        <h4>${ICONS.sparkle} 你好！我是你的算法竞赛助教</h4>
        <div>${isRecordPage ? '已自动载入你本次提交的代码与评测状态。请问需要排查哪方面的疑问？' : '已自动载入当前题面信息。需要思路分析或复杂度建议随时问我！'}</div>
        <div class="ai-prompts-group">${welcomePrompts}</div>
      </div>
    </div>
    <div class="ai-footer">
      <div class="ai-input-box">
        <textarea class="ai-textarea" id="ai-textarea" placeholder="向 AI 提问..." rows="1"></textarea>
        <button class="ai-send-btn" id="ai-send-btn" disabled title="发送">${ICONS.send}</button>
      </div>
      <div class="ai-footer-hint">Enter 发送，Shift + Enter 换行</div>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(sidebar);

  const ball = document.createElement('div');
  ball.className = 'ai-float-ball';
  ball.innerHTML = `${ICONS.sparkle}&nbsp;AI`;
  ball.style.left = `${window.innerWidth - BALL_SIZE - 24}px`;
  ball.style.top = `${window.innerHeight - BALL_SIZE - 96}px`;
  document.body.appendChild(ball);

  let isOpen = false;
  let dragging = false;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  let isGenerating = false;
  let currentAbortController: AbortController | null = null;
  const messages: ChatMessage[] = [];

  const bodyEl = sidebar.querySelector('#ai-body') as HTMLDivElement;
  const textarea = sidebar.querySelector('#ai-textarea') as HTMLTextAreaElement;
  const sendBtn = sidebar.querySelector('#ai-send-btn') as HTMLButtonElement;
  const clearBtn = sidebar.querySelector('#ai-clear-btn') as HTMLButtonElement;
  const closeBtn = sidebar.querySelector('#ai-close-btn') as HTMLButtonElement;

  function toggleSidebar(open?: boolean) {
    isOpen = typeof open === 'boolean' ? open : !isOpen;
    if (isOpen) {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
      ball.classList.add('active');
      setTimeout(() => textarea.focus(), 150);
    } else {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
      ball.classList.remove('active');
    }
  }

  ball.addEventListener('pointerdown', (ev) => {
    dragging = true;
    hasMoved = false;
    startX = ev.clientX;
    startY = ev.clientY;
    originLeft = ball.offsetLeft;
    originTop = ball.offsetTop;
    ball.setPointerCapture(ev.pointerId);
  });

  ball.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (Math.hypot(dx, dy) > 5) hasMoved = true;
    const left = clamp(originLeft + dx, EDGE_MARGIN, window.innerWidth - BALL_SIZE - EDGE_MARGIN);
    const top = clamp(originTop + dy, EDGE_MARGIN, window.innerHeight - BALL_SIZE - EDGE_MARGIN);
    ball.style.left = `${left}px`;
    ball.style.top = `${top}px`;
  });

  ball.addEventListener('pointerup', (ev) => {
    if (!dragging) return;
    dragging = false;
    ball.releasePointerCapture(ev.pointerId);
    if (!hasMoved) toggleSidebar();
  });

  ball.addEventListener('pointercancel', () => {
    dragging = false;
  });

  window.addEventListener('resize', () => {
    const left = clamp(ball.offsetLeft, EDGE_MARGIN, window.innerWidth - BALL_SIZE - EDGE_MARGIN);
    const top = clamp(ball.offsetTop, EDGE_MARGIN, window.innerHeight - BALL_SIZE - EDGE_MARGIN);
    ball.style.left = `${left}px`;
    ball.style.top = `${top}px`;
  });

  closeBtn.addEventListener('click', () => toggleSidebar(false));
  backdrop.addEventListener('click', () => toggleSidebar(false));
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && isOpen) toggleSidebar(false);
  });

  function updateSendButton() {
    if (isGenerating) {
      sendBtn.innerHTML = ICONS.stop;
      sendBtn.title = '停止生成';
      sendBtn.classList.add('stop');
      sendBtn.disabled = false;
    } else {
      sendBtn.innerHTML = ICONS.send;
      sendBtn.title = '发送';
      sendBtn.classList.remove('stop');
      sendBtn.disabled = !textarea.value.trim();
    }
  }

  function appendUserMessage(text: string) {
    const msgEl = document.createElement('div');
    msgEl.className = 'ai-msg user';
    msgEl.innerHTML = `
      <div class="ai-msg-avatar">${ICONS.user}</div>
      <div class="ai-msg-content-wrap">
        <div class="ai-msg-bubble">${escapeHtml(text)}</div>
      </div>
    `;
    bodyEl.appendChild(msgEl);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function createAssistantMessageElement() {
    const msgEl = document.createElement('div');
    msgEl.className = 'ai-msg assistant';
    msgEl.innerHTML = `
      <div class="ai-msg-avatar">${ICONS.robot}</div>
      <div class="ai-msg-content-wrap">
        <div class="ai-msg-bubble"></div>
      </div>
    `;
    bodyEl.appendChild(msgEl);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return msgEl.querySelector('.ai-msg-bubble') as HTMLDivElement;
  }

  async function handleSend() {
    if (isGenerating) {
      currentAbortController?.abort();
      return;
    }

    const content = textarea.value.trim();
    if (!content) return;

    messages.push({ role: 'user', content });
    appendUserMessage(content);

    textarea.value = '';
    textarea.style.height = '24px';

    isGenerating = true;
    updateSendButton();

    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    messages.push(assistantMsg);
    const bubbleEl = createAssistantMessageElement();

    currentAbortController = new AbortController();

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(0, -1),
          contextType: aiCtx.type,
          pid: aiCtx.pid,
          rid: aiCtx.rid,
          domainId: aiCtx.domainId,
        }),
        signal: currentAbortController.signal,
      });

      if (!res.ok) {
        let errStr = `HTTP ${res.status}`;
        try {
          const json = await res.json();
          if (json.error) errStr = json.error;
        } catch {
          errStr = await res.text();
        }
        assistantMsg.content = `⚠️ **请求失败**：${errStr}`;
        bubbleEl.innerHTML = renderMarkdown(assistantMsg.content);
        return;
      }

      if (!res.body) {
        assistantMsg.content = '⚠️ **错误**：未能获取到 AI 服务响应流';
        bubbleEl.innerHTML = renderMarkdown(assistantMsg.content);
        return;
      }

      const reader = res.body.getReader();
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
          if (trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.error) {
                assistantMsg.content += `\n\n⚠️ **错误**：${data.error}`;
              } else if (data.delta) {
                assistantMsg.content += data.delta;
              }
              bubbleEl.innerHTML = renderMarkdown(assistantMsg.content);
              bodyEl.scrollTop = bodyEl.scrollHeight;
            } catch {
              // 忽略解析片段异常
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        assistantMsg.content += '\n\n*（已停止生成）*';
      } else {
        assistantMsg.content = `⚠️ **网络异常**：${err.message || '连接 AI 服务失败'}`;
      }
      bubbleEl.innerHTML = renderMarkdown(assistantMsg.content);
    } finally {
      isGenerating = false;
      currentAbortController = null;
      updateSendButton();
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }
  }

  // 快捷问题点击
  bodyEl.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest('.ai-prompt-chip') as HTMLElement;
    if (chip) {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt && !isGenerating) {
        textarea.value = prompt;
        handleSend();
      }
    }

    // 复制代码块
    const copyBtn = (ev.target as HTMLElement).closest('.ai-copy-btn') as HTMLButtonElement;
    if (copyBtn) {
      const code = decodeURIComponent(copyBtn.getAttribute('data-code') || '');
      navigator.clipboard.writeText(code).then(() => {
        const originText = copyBtn.textContent;
        copyBtn.textContent = '已复制 ✓';
        setTimeout(() => {
          copyBtn.textContent = originText;
        }, 1500);
      });
    }
  });

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    updateSendButton();
  });

  textarea.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      if (!isGenerating && textarea.value.trim()) {
        handleSend();
      }
    }
  });

  sendBtn.addEventListener('click', handleSend);

  clearBtn.addEventListener('click', () => {
    if (isGenerating) currentAbortController?.abort();
    messages.length = 0;
    bodyEl.innerHTML = '';
    const welcome = document.createElement('div');
    welcome.className = 'ai-welcome-card';
    welcome.innerHTML = `
      <h4>${ICONS.sparkle} 对话已清空</h4>
      <div>${isRecordPage ? '针对本次提交记录有新的疑问可以随时提出。' : '对本题有新的疑问可以随时提出。'}</div>
    `;
    bodyEl.appendChild(welcome);
  });
}

addPage(new NamedPage(['problem_detail', 'record_detail'], () => {
  if (!UiContext.showAiFloatButton) return;
  setupAiAssistantUI();
}));