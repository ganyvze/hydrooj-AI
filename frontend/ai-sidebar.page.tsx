import $ from 'jquery';
import React from 'react';
import { NamedPage } from 'vj/misc/Page';
import { i18n, tpl } from 'vj/utils';
import Dialog from 'vj/components/dialog';
import Notification from 'vj/components/notification';
// 如果项目中已经有了 markdown 渲染工具可以直接 import，如 import { render } from 'vj/utils/markdown'

const page = new NamedPage(['problem_detail', 'record_detail'], () => {
    // 注入 DOM 按钮
    if (page.name === 'problem_detail') {
        const menu = $('.section--problem-sidebar .menu');
        menu.append(`<li><a href="javascript:;" id="btn-ai-ask"><span class="icon icon-chat"></span> ${i18n('AI Assistant')}</a></li>`);
    } else if (page.name === 'record_detail') {
        // 只有当前页面存在代码区域（意味着有权限查看代码）才展示改错按钮
        if ($('.compiler-text').length || $('.monaco-editor').length) {
            const menu = $('.section.side .menu');
            menu.append(`<li><a href="javascript:;" id="btn-ai-debug"><span class="icon icon-bug"></span> ${i18n('AI Debug')}</a></li>`);
        }
    }

    $(document).on('click', '#btn-ai-ask, #btn-ai-debug', (ev) => {
        ev.preventDefault();
        const type = ev.currentTarget.id === 'btn-ai-ask' ? 'ask' : 'debug';
        
        // 解析当前页面的 ID (pid 或 rid)
        const idMatches = window.location.pathname.match(/\/(p|record)\/([a-zA-Z0-9_-]+)/);
        if (!idMatches) return;
        const targetId = idMatches[2];

        openAiChat(type, targetId);
    });
});

function openAiChat(type: 'ask' | 'debug', targetId: string) {
    let ws: WebSocket;
    let chatHistory: any[] = [];
    
    // 初始化对话框 UI
    const $body = $(tpl(
        <div className="ai-chat-container" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
            <div className="ai-chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '10px', background: '#f5f5f5', marginBottom: '10px', borderRadius: '4px' }}>
                <div className="ai-message system"><i>{i18n('Connecting to AI Assistant...')}</i></div>
            </div>
            <div className="ai-chat-input-area" style={{ display: 'flex' }}>
                <input type="text" className="ai-chat-input textbox" placeholder={i18n('Ask AI')} style={{ flex: 1, marginRight: '10px' }} />
                <button className="ai-chat-send button primary">{i18n('Send')}</button>
            </div>
        </div>
    ));

    const dialog = new Dialog({
        width: '600px',
        $body,
        classes: 'ai-dialog',
    });

    const $messages = $body.find('.ai-chat-messages');
    const $input = $body.find('.ai-chat-input');
    const $sendBtn = $body.find('.ai-chat-send');

    // 建立 WS 连接
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ai/chat-conn`;
    ws = new WebSocket(wsUrl);

    let currentAiMessageNode: JQuery<HTMLElement> | null = null;
    let currentRawMessage = '';

    ws.onopen = () => {
        $messages.html('');
        appendMessage('system', i18n('Ready. How can I help you?'));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.error) {
            Notification.error(data.error);
            appendMessage('system', `Error: ${data.error}`);
            $sendBtn.prop('disabled', false);
            return;
        }

        if (data.token) {
            // 流式拼装
            if (!currentAiMessageNode) {
                currentAiMessageNode = $('<div class="ai-message bot" style="background: white; padding: 10px; margin-bottom: 8px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1)"></div>');
                $messages.append(currentAiMessageNode);
                currentRawMessage = '';
            }
            currentRawMessage += data.token;
            // 此处简单处理，如果是复杂 markdown 可以使用 marked()
            currentAiMessageNode.text(currentRawMessage); 
            $messages.scrollTop($messages[0].scrollHeight);
        }

        if (data.done) {
            // 单次流式回复结束
            chatHistory.push({ role: 'assistant', content: currentRawMessage });
            currentAiMessageNode = null;
            $sendBtn.prop('disabled', false);
            $input.val('').focus();
        }
    };

    ws.onclose = () => {
        appendMessage('system', 'Connection closed.');
        $sendBtn.prop('disabled', true);
    };

    const appendMessage = (role: string, text: string) => {
        const style = role === 'user' ? 'background: #0078d7; color: white; margin-left: 20%;' : 'background: white; margin-right: 20%;';
        const node = $(`<div class="ai-message ${role}" style="padding: 10px; margin-bottom: 8px; border-radius: 4px; ${style}">${text}</div>`);
        $messages.append(node);
        $messages.scrollTop($messages[0].scrollHeight);
    };

    const sendMessage = () => {
        const text = $input.val() as string;
        if (!text.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
        
        $sendBtn.prop('disabled', true);
        appendMessage('user', text);
        
        const payload = {
            type,
            id: targetId,
            question: text,
            history: chatHistory
        };
        
        chatHistory.push({ role: 'user', content: text });
        ws.send(JSON.stringify(payload));
        $input.val('');
    };

    $sendBtn.on('click', sendMessage);
    $input.on('keypress', (e) => {
        if (e.which === 13) sendMessage();
    });

    // 绑定关闭事件，销毁 WS
    dialog.$dom.on('vjDomDialogHidden', () => {
        if (ws) ws.close();
    });

    dialog.open();
}