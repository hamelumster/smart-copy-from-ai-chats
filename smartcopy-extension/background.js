// background.js

// Создаём пункт меню при установке / обновлении
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "smartcopy-md",
    title: "SmartCopy — Copy as Markdown",
    contexts: ["selection"] // показывать только при выделении
  });
});

// Реакция на клик по пункту меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "smartcopy-md" || !tab.id) return;

  // Шлём сообщение в content.js во вкладке
  chrome.tabs.sendMessage(tab.id, { type: "SMARTCOPY_SELECTION" });
});
