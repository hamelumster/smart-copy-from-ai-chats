// js/main.js
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('copyMarkdownBtn');
  const content = document.getElementById('content');

  // Настраиваем Turndown: markdown-выход
  const turndownService = new TurndownService({
    codeBlockStyle: 'fenced', // ```код``` вместо отступов
    headingStyle: 'atx',      // # Заголовок
    bulletListMarker: '-',    // списки через "-"
  });

  // Подключаем GitHub-Flavored Markdown (таблицы, т.п.)
  if (window.turndownPluginGfm) {
    turndownService.use(turndownPluginGfm.gfm);
  }

  // Чтобы <pre><code> → fenced code block с сохранением отступов
  turndownService.addRule('codeBlocks', {
    filter: function (node) {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: function (content, node) {
      const codeNode = node.firstChild;
      const className = codeNode.getAttribute('class') || '';
      // ищем что-то вроде "language-python"
      const match = className.match(/language-([a-z0-9]+)/i);
      const lang = match ? match[1] : '';
      const code = codeNode.textContent.replace(/\n+$/g, ''); // убираем лишние \n в конце

      const fence = '```';
      return '\n\n' + fence + (lang ? lang : '') + '\n' + code + '\n' + fence + '\n\n';
    }
  });

  btn.addEventListener('click', async () => {
    try {
      const selectionHtml = getSelectionHtml();
      const html = selectionHtml && selectionHtml.trim()
        ? selectionHtml            // если пользователь что-то выделил
        : content.innerHTML;       // иначе берём весь #content

      const markdown = turndownService.turndown(html);

      await navigator.clipboard.writeText(markdown);

      console.log('Markdown скопирован:\n', markdown);
      alert('Скопировано как Markdown! ✅');
    } catch (err) {
      console.error('Ошибка копирования:', err);
      alert('Не удалось скопировать в буфер. Посмотри консоль.');
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
