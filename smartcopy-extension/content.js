// content.js

// Настраиваем Turndown один раз
const turndownService = new TurndownService({
  codeBlockStyle: 'fenced',
  headingStyle: 'atx',
  bulletListMarker: '-'
});

// GFM (таблицы и т.п.) — только если плагин есть
if (window.turndownPluginGfm) {
  turndownService.use(window.turndownPluginGfm.gfm);
}

// Нормализация HTML из чата / документации: выкидываем мусор
function normalizeChatHtml(root) {
  // 1) Чистим служебные data-* атрибуты
  root.querySelectorAll('[data-start], [data-end]').forEach(el => {
    el.removeAttribute('data-start');
    el.removeAttribute('data-end');
  });

  // 2) Удаляем кнопки "Copy code" / "Копировать код"
  root.querySelectorAll('button').forEach(btn => {
    const txt = btn.textContent.trim().toLowerCase();
    if (txt === 'copy code' || txt === 'копировать код') {
      btn.remove();
    }
  });

  // 3) Удаляем хедеры над кодом вида: "js" / "python" + кнопка
  root.querySelectorAll('pre').forEach(pre => {
    pre.querySelectorAll('div').forEach(div => {
      const hasButton = !!div.querySelector('button');
      const hasCode   = !!div.querySelector('code');
      if (hasButton && !hasCode) {
        div.remove();
      }
    });
  });
}

// Правило: любой <pre> с <code> -> fenced code block
turndownService.addRule('codeBlocks', {
  filter: function (node) {
    return node.nodeName === 'PRE' && node.querySelector('code');
  },
  replacement: function (content, node) {
    const codeNode = node.querySelector('code');
    const className = codeNode.getAttribute('class') || '';
    const match = className.match(/language-([a-z0-9]+)/i);
    const lang = match ? match[1] : '';
    const code = codeNode.textContent.replace(/\n+$/g, '');

    const fence = '```';
    return '\n\n' + fence + (lang ? lang : '') + '\n' + code + '\n' + fence + '\n\n';
  }
});

// Берём текущее выделение -> HTML-строка
function getSelectionHtml() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return '';
  }

  const range = selection.getRangeAt(0).cloneRange();
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  return container.innerHTML;
}

// Главная функция: выделение -> чистый Markdown -> буфер
async function smartCopySelectionAsMarkdown() {
  const html = getSelectionHtml();
  if (!html.trim()) {
    alert('SmartCopy: сначала выделите текст 🙂');
    return;
  }

  // Заворачиваем html во временной корень, чтобы удобно чистить
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  // чистим мусор
  normalizeChatHtml(wrapper);

  const markdown = turndownService.turndown(wrapper.innerHTML);

  try {
    await navigator.clipboard.writeText(markdown);
    console.log('SmartCopy — Markdown скопирован:\n', markdown);
    // без alert
  } catch (err) {
    console.error('SmartCopy: ошибка копирования в буфер', err);
    alert('SmartCopy: не удалось скопировать в буфер.');
  }
}

// Слушаем команду из background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SMARTCOPY_SELECTION') {
    smartCopySelectionAsMarkdown();
  }
});
