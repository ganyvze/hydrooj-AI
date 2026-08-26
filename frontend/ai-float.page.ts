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
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
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

/* ==================== 遮罩层 (移动端/遮罩效果) ==================== */
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
  width: 420px;
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

/* 自定义滚动条 */
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
  max-width: calc(100% - 44px);
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
  white-space: pre-wrap;
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
}

/* 打字动画指示器 */
.ai-typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 12px;
  border-top-left-radius: 2px;
  width: fit-content;
}
.ai-dot {
  width: 6px;
  height: 6px;
  background: #9ca3af;
  border-radius: 50%;
  animation: aiBounce 1.4s infinite ease-in-out both;
}
.ai-dot:nth-child(1) { animation-delay: -0.32s; }
.ai-dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes aiBounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
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
.theme--dark .ai-typing {
  background: #27272a;
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

// SVG 图标集
const ICONS = {
  robot: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
  sparkle: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
  user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
};

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function setupAiAssistantUI() {
  // 1. 注入样式
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // 2. 创建遮罩层与侧边栏结构
  const backdrop = document.createElement('div');
  backdrop.className = 'ai-drawer-backdrop';

  const sidebar = document.createElement('div');
  sidebar.className = 'ai-sidebar';
  sidebar.innerHTML = `
    <div class="ai-header">
      <div class="ai-header-info">
        <div class="ai-avatar-icon">${ICONS.robot}</div>
        <div class="ai-title-wrap">
          <span class="ai-title">AI 助教</span>
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
        <div>我可以为你提供题目思路分析、代码疑点排查及时间复杂度优化建议（不会直接给出完整 AC 代码）。</div>
        <div class="ai-prompts-group">
          <div class="ai-prompt-chip" data-prompt="请用通俗的语言解释这道题目的含义与核心约束。">💡 解释题目意思</div>
          <div class="ai-prompt-chip" data-prompt="这道题有什么解题思路？可以给一些关键算法提示吗？">🎯 解题思路提示</div>
          <div class="ai-prompt-chip" data-prompt="如何分析这道题的数据范围和时空复杂度？">⚡ 复杂度分析</div>
        </div>
      </div>
    </div>
    <div class="ai-footer">
      <div class="ai-input-box">
        <textarea class="ai-textarea" id="ai-textarea" placeholder="向 AI 助教提问..." rows="1"></textarea>
        <button class="ai-send-btn" id="ai-send-btn" disabled title="发送">${ICONS.send}</button>
      </div>
      <div class="ai-footer-hint">Enter 发送，Shift + Enter 换行</div>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(sidebar);

  // 3. 创建可拖拽悬浮球
  const ball = document.createElement('div');
  ball.className = 'ai-float-ball';
  ball.innerHTML = `${ICONS.sparkle}&nbsp;AI`;
  ball.style.left = `${window.innerWidth - BALL_SIZE - 24}px`;
  ball.style.top = `${window.innerHeight - BALL_SIZE - 96}px`;
  document.body.appendChild(ball);

  // 4. 状态与事件处理
  let isOpen = false;
  let dragging = false;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

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

  // 悬浮球拖拽与点击判定
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
    if (Math.hypot(dx, dy) > 5) {
      hasMoved = true;
    }
    const left = clamp(originLeft + dx, EDGE_MARGIN, window.innerWidth - BALL_SIZE - EDGE_MARGIN);
    const top = clamp(originTop + dy, EDGE_MARGIN, window.innerHeight - BALL_SIZE - EDGE_MARGIN);
    ball.style.left = `${left}px`;
    ball.style.top = `${top}px`;
  });

  ball.addEventListener('pointerup', (ev) => {
    if (!dragging) return;
    dragging = false;
    ball.releasePointerCapture(ev.pointerId);
    if (!hasMoved) {
      toggleSidebar();
    }
  });

  ball.addEventListener('pointercancel', () => {
    dragging = false;
  });

  // 窗口大小变动重置位置
  window.addEventListener('resize', () => {
    const left = clamp(ball.offsetLeft, EDGE_MARGIN, window.innerWidth - BALL_SIZE - EDGE_MARGIN);
    const top = clamp(ball.offsetTop, EDGE_MARGIN, window.innerHeight - BALL_SIZE - EDGE_MARGIN);
    ball.style.left = `${left}px`;
    ball.style.top = `${top}px`;
  });

  // 关闭交互
  closeBtn.addEventListener('click', () => toggleSidebar(false));
  backdrop.addEventListener('click', () => toggleSidebar(false));
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && isOpen) {
      toggleSidebar(false);
    }
  });

  // 消息渲染
  function appendMessage(role: 'assistant' | 'user', text: string) {
    const msgEl = document.createElement('div');
    msgEl.className = `ai-msg ${role}`;
    msgEl.innerHTML = `
      <div class="ai-msg-avatar">${role === 'assistant' ? ICONS.robot : ICONS.user}</div>
      <div class="ai-msg-content-wrap">
        <div class="ai-msg-bubble">${escapeHtml(text)}</div>
      </div>
    `;
    bodyEl.appendChild(msgEl);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function showTyping() {
    const typingEl = document.createElement('div');
    typingEl.className = 'ai-msg assistant';
    typingEl.id = 'ai-typing-indicator';
    typingEl.innerHTML = `
      <div class="ai-msg-avatar">${ICONS.robot}</div>
      <div class="ai-msg-content-wrap">
        <div class="ai-typing">
          <div class="ai-dot"></div>
          <div class="ai-dot"></div>
          <div class="ai-dot"></div>
        </div>
      </div>
    `;
    bodyEl.appendChild(typingEl);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function removeTyping() {
    const el = bodyEl.querySelector('#ai-typing-indicator');
    if (el) el.remove();
  }

  function escapeHtml(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 发送消息交互 (Mock 响应)
  async function handleSend() {
    const content = textarea.value.trim();
    if (!content) return;

    messages.push({ role: 'user', content });
    appendMessage('user', content);
    textarea.value = '';
    textarea.style.height = '24px';
    sendBtn.disabled = true;

    // 模拟 AI 打字回复效果
    showTyping();
    setTimeout(() => {
      removeTyping();
      const mockReply = `收到你的提问："${content}"。\n\n当前 AI 界面已就绪。连接后台 API 后，我将在此为你实时提供该题目的解题思路与分析！`;
      messages.push({ role: 'assistant', content: mockReply });
      appendMessage('assistant', mockReply);
    }, 900);
  }

  // 快捷问题点击
  bodyEl.addEventListener('click', (ev) => {
    const target = (ev.target as HTMLElement).closest('.ai-prompt-chip') as HTMLElement;
    if (!target) return;
    const prompt = target.getAttribute('data-prompt');
    if (prompt) {
      textarea.value = prompt;
      textarea.dispatchEvent(new Event('input'));
      handleSend();
    }
  });

  // 输入框自适应高度与按键监听
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    sendBtn.disabled = !textarea.value.trim();
  });

  textarea.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      if (!sendBtn.disabled) {
        handleSend();
      }
    }
  });

  sendBtn.addEventListener('click', handleSend);

  // 清空对话
  clearBtn.addEventListener('click', () => {
    messages.length = 0;
    bodyEl.innerHTML = '';
    const welcome = document.createElement('div');
    welcome.className = 'ai-welcome-card';
    welcome.innerHTML = `
      <h4>${ICONS.sparkle} 对话已清空</h4>
      <div>有新的疑问可以随时提出，祝你刷题愉快！</div>
    `;
    bodyEl.appendChild(welcome);
  });
}

addPage(new NamedPage(['problem_detail', 'record_detail'], () => {
  if (!UiContext.showAiFloatButton) return;
  setupAiAssistantUI();
}));