import $ from 'jquery';
import Dialog from 'vj/components/dialog';
import Notification from 'vj/components/notification';
import { NamedPage } from 'vj/misc/Page';
import { i18n, request } from 'vj/utils';

type Message = { role: 'user' | 'assistant'; content: string };

const escapeHtml = (value: string) => $('<div/>').text(value).html();
// Safe, intentionally small Markdown subset for the framework; no provider HTML is inserted.
const renderMarkdown = (value: string) => escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

function idFromPath(kind: 'p' | 'record') {
    return new RegExp(`/${kind}/([^/?#]+)`).exec(location.pathname)?.[1];
}

function openChat(mode: 'ask' | 'debug', target: string) {
    const messages: Message[] = [];
    const $messages = $('<div class="ai-assistant__messages"/>');
    const $input = $('<textarea class="textbox ai-assistant__input" rows="4"/>')
        .attr('placeholder', i18n('Ask AI'));
    const $send = $('<button class="rounded primary button" type="button"/>').text(i18n('Send'));
    const $body = $('<div class="ai-assistant"/>').append($messages, $input, $('<div class="ai-assistant__actions"/>').append($send));
    const dialog = new Dialog({ $body, width: 680, classes: 'ai-assistant-dialog' });

    const append = (message: Message) => {
        const label = message.role === 'user' ? i18n('You') : i18n('AI assistant');
        $messages.append($('<div class="ai-assistant__message"/>')
            .addClass(`ai-assistant__message--${message.role}`)
            .append($('<strong/>').text(`${label}: `), $('<div/>').html(renderMarkdown(message.content))));
        $messages.scrollTop($messages.prop('scrollHeight'));
    };
    const submit = async () => {
        const question = String($input.val() || '').trim();
        if (!question) return;
        append({ role: 'user', content: question });
        $input.val('');
        $send.prop('disabled', true).text('…');
        try {
            const payload = mode === 'ask'
                ? { pid: target, question, history: messages }
                : { rid: target, question, history: messages };
            const response = await request.post(mode === 'ask' ? '/ai/ask' : '/ai/debug', payload);
            const reply = response?.reply || response?.body?.reply;
            if (!reply) throw new Error(response?.error || i18n('AI service is temporarily unavailable.'));
            messages.push({ role: 'user', content: question }, { role: 'assistant', content: reply });
            append({ role: 'assistant', content: reply });
        } catch (error) {
            Notification.error(error?.message || i18n('AI service is temporarily unavailable.'));
        } finally {
            $send.prop('disabled', false).text(i18n('Send'));
        }
    };
    $send.on('click', submit);
    $input.on('keydown', (event) => {
        if (event.ctrlKey && event.key === 'Enter') submit();
    });
    dialog.open();
}

function appendSidebarAction($sidebar: JQuery, action: 'ask' | 'debug', label: string, icon: string, onClick: () => void) {
    if ($sidebar.find(`[data-ai-action="${action}"]`).length) return;
    let $menu = $sidebar.find('.menu').first();
    if (!$menu.length) {
        $menu = $('<ol class="menu"/>');
        $('<div class="section__body no-padding"/>').append($menu).appendTo($sidebar);
    }
    $('<li class="menu__item"><a class="menu__link" href="#"><span></span> </a></li>')
        .find('a').attr('data-ai-action', action).find('span').addClass(`icon ${icon}`).end()
        .append(document.createTextNode(label)).end()
        .on('click', 'a', (event) => { event.preventDefault(); onClick(); })
        .appendTo($menu);
}

new NamedPage(['problem_detail'], () => {
    const pid = idFromPath('p');
    const $menu = $('.section--problem-sidebar .menu').first();
    if (!pid || !$menu.length) return;
    appendSidebarAction($menu.closest('.section--problem-sidebar'), 'ask', i18n('AI Q&A'), 'icon-comment', () => openChat('ask', pid));
});

new NamedPage(['record_detail'], () => {
    const rid = idFromPath('record');
    const $sidebar = $('.section.side').first();
    // 服务器仅接受提交者本人的记录；这仅仅是一种用户界面（UI）层面的交互提示。
    if (!rid || !$sidebar.length) return;
    appendSidebarAction($sidebar, 'debug', i18n('AI Debug'), 'icon-wrench', () => openChat('debug', rid));
});
