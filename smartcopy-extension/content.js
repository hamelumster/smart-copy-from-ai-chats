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

function stripStandaloneLanguageHeaders(markdown) {
  const LANG_HEADERS = [
    'python', 'py',
    'bash', 'shell', 'sh',
    'javascript', 'js', 'typescript', 'ts',
    'json', 'yaml', 'yml',
    'sql', 'html', 'css',
    'go', 'java', 'rust',
    'php', 'ruby', 'r',
    'c', 'c++', 'c#', 'cpp'
  ];

  const lines = markdown.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();

    // Проверяем, не "одинокий ли это язык"
    const isLang = LANG_HEADERS.includes(trimmed);

    if (isLang) {
      // Смотрим "окружение": сверху пусто/начало, снизу есть ещё текст
      const prev = i > 0 ? lines[i - 1].trim() : '';
      // ищем следующую НЕпустую строку
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') {
        j++;
      }
      const hasNextNonEmpty = j < lines.length;

      const looksLikeHeader =
        (prev === '' || prev.startsWith('#')) && hasNextNonEmpty;

      if (looksLikeHeader) {
        // пропускаем ЭТУ строку, не добавляем в result
        continue;
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

function normalizeChatHtml(root) {
  // 1) Чистим служебные data-* атрибуты
  root.querySelectorAll('[data-start], [data-end]').forEach(el => {
    el.removeAttribute('data-start');
    el.removeAttribute('data-end');
  });

  // 2) Удаляем очевидные copy/download-кнопки (DeepSeek, ChatGPT, др.)
  root.querySelectorAll('button, [role="button"]').forEach(btn => {
    const txt = (btn.textContent || '').trim().toLowerCase();

    if (
      txt.includes('copy') ||
      txt.includes('копир') ||      // копировать / скопировать
      txt.includes('скачать') ||
      txt.includes('download')
    ) {
      btn.remove();
    }
  });

  // 3) Удаляем svg-иконки (обычно иконки кнопок в тулбарах)
  root.querySelectorAll('svg').forEach(svg => svg.remove());

  // Вспомогательная: похоже ли это на "шапку языка" (python, js, bash и т.п.)
  const LANG_WORDS = [
    'python', 'py',
    'bash', 'shell', 'sh',
    'javascript', 'js', 'typescript', 'ts',
    'json', 'yaml', 'yml',
    'sql', 'html', 'css',
    'go', 'java', 'rust',
    'c++', 'c#', 'cpp', 'php',
    'ruby', 'r', 'swift'
  ];

  function looksLikeLangHeader(el) {
    const raw = (el.textContent || '').trim().toLowerCase();
    if (!raw) return false;
    if (raw.length > 60) return false; // шапка языка обычно короткая

    const normalized = raw.replace(/\s+/g, ' '); // "python   копировать" → "python копировать"

    // если в тексте есть название языка — считаем шапкой
    return LANG_WORDS.some(lang => normalized.includes(lang));
  }

  // 4) Обрабатываем все <pre> — чистим тулбары вокруг них
  root.querySelectorAll('pre').forEach(pre => {
    // 4.1. Предыдущий сосед — типичный случай шапки ("python | Копировать | Скачать")
    let prev = pre.previousElementSibling;
    if (prev) {
      const hasButton = !!prev.querySelector('button, [role="button"]');
      const hasCode   = !!prev.querySelector('code, pre');

      if (!hasCode && (hasButton || looksLikeLangHeader(prev))) {
        prev.remove();
      }
    }

    // 4.2. Внутри родителя тоже могут быть тулбары (DeepSeek, ChatGPT, др.)
    const parent = pre.parentElement;
    if (parent) {
      parent.querySelectorAll('div, header').forEach(el => {
        if (el === pre) return; // сам <pre> не трогаем

        const hasCode   = !!el.querySelector('code, pre');
        const hasButton = !!el.querySelector('button, [role="button"]');
        const isToolbar =
          el.getAttribute('role') === 'toolbar' ||
          /toolbar/i.test(el.className || '');

        if (!hasCode && (hasButton || isToolbar || looksLikeLangHeader(el))) {
          el.remove();
        }
      });
    }
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

  let markdown = turndownService.turndown(wrapper.innerHTML);
  markdown = stripStandaloneLanguageHeaders(markdown);

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
