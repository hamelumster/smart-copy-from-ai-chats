(() => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount || sel.isCollapsed) {
    alert('Сначала выдели кусок текста 🙂');
    return;
  }
  const range = sel.getRangeAt(0).cloneRange();
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  copy(container.innerHTML); // devtools-функция
  alert('HTML скопирован в буфер ✅');
})();