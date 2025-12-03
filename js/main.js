// js/main.js
document.addEventListener('DOMContentLoaded', () => {
  const copyBtn  = document.getElementById('SmartCopyBtn');
  const pasteBtn = document.getElementById('pasteHtmlBtn');
  const content  = document.getElementById('content');

  // Настраиваем Turndown: markdown-выход
  const turndownService = new TurndownService({
    codeBlockStyle: 'fenced', // ```код``` вместо отступов
    headingStyle: 'atx',      // # Заголовок
    bulletListMarker: '-',    // списки через "-"
  });

  // GFM (таблицы и т.п.)
  if (window.turndownPluginGfm) {
    turndownService.use(turndownPluginGfm.gfm);
  }

  // Нормализация HTML из чата (чистим мусор)
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

  // <pre> → fenced code block
  turndownService.addRule('codeBlocks', {
    filter: function (node) {
      // Любой <pre>, внутри которого есть <code>
      return node.nodeName === 'PRE' && node.querySelector('code');
    },
    replacement: function (content, node) {
      const codeNode  = node.querySelector('code');
      const className = codeNode.getAttribute('class') || '';
      const match     = className.match(/language-([a-z0-9]+)/i);
      const lang      = match ? match[1] : '';
      const code      = codeNode.textContent.replace(/\n+$/g, '');

      const fence = '```';
      return '\n\n' + fence + (lang ? lang : '') + '\n' + code + '\n' + fence + '\n\n';
    }
  });

  // 🔹 Кнопка "Copy as Markdown"
  copyBtn.addEventListener('click', async () => {
    try {
      const selectionHtml = getSelectionHtml();
      const html = selectionHtml && selectionHtml.trim()
        ? selectionHtml
        : content.innerHTML;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;

      // чистим мусор
      normalizeChatHtml(wrapper);

      const markdown = turndownService.turndown(wrapper.innerHTML);

      await navigator.clipboard.writeText(markdown);
      console.log('Markdown скопирован:\n', markdown);
      alert('Скопировано как Markdown! ✅');
    } catch (err) {
      console.error('Ошибка копирования:', err);
      alert('Не удалось скопировать в буфер. Посмотри консоль.');
    }
  });

  // 🔹 Кнопка "Вставить HTML из буфера"
  pasteBtn.addEventListener('click', async () => {
    try {
      const html = await navigator.clipboard.readText();
      if (!html) {
        alert('В буфере нет текста / HTML 😢');
        return;
      }
      content.innerHTML = html;
      console.log('HTML из буфера вставлен в #content');
      alert('HTML из буфера подставлен в content ✅');
    } catch (err) {
      console.error('Ошибка чтения буфера:', err);
      alert('Не удалось прочитать из буфера. Открой страницу через http://localhost, а не file://');
    }
  });
});

/**
 * Берёт текущее выделение и возвращает его как HTML-строку.
 * Если ничего не выделено — вернёт пустую строку.
 */
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
