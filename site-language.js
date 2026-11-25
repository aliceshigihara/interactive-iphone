/* Select site chrome language without changing any story data. */
(() => {
  const root = document.documentElement;
  const url = new URL(location.href);
  const reader = url.searchParams.get('reader') === '1';
  const key = 'fablyphone:language';
  const explicit = url.searchParams.get('lang');
  let lang = 'pt';
  if (!reader) {
    try {
      if (explicit === 'en' || explicit === 'pt') localStorage.setItem(key, explicit);
      lang = explicit === 'en' || explicit === 'pt' ? explicit : localStorage.getItem(key) === 'en' ? 'en' : 'pt';
    } catch {
      if (explicit === 'en') lang = 'en';
    }
    root.lang = lang === 'en' ? 'en' : 'pt-BR';
  }
  function linkLanguage(link, next) {
    const target = new URL(link.getAttribute('href'), location.href);
    target.searchParams.set('lang', next);
    link.href = target.href;
  }
  const dictionary = lines => new Map(lines.trim().split('\n').filter(Boolean).map(line => line.split('|')));
  function translate(node, copy, allow = () => true) {
    const attrs = ['title','aria-label','placeholder','alt','data-title','data-copy'];
    const normalized = value => value.trim().replace(/\s+/g,' ');
    function apply(current) {
      if (current.nodeType === Node.TEXT_NODE) {
        const value = current.nodeValue;
        const next = copy.get(normalized(value));
        if (next && value.trim() !== next && allow(current.parentElement, current)) {
          current.nodeValue = value.replace(/\S[\s\S]*\S|\S/, () => next);
        }
      } else if (allow(current)) {
        for (const attr of attrs) {
          const value = current.getAttribute(attr);
          const next = value && copy.get(normalized(value));
          if (next && value !== next) current.setAttribute(attr,next);
        }
      }
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) return;
    apply(node);
    if (node.nodeType === Node.TEXT_NODE) return;
    const walk = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) apply(walk.currentNode);
  }
  window.SiteLanguage = {
    lang, reader, text: (pt, en) => lang === 'en' ? en : pt, dictionary, translate
  };
  if (reader) return;
  document.addEventListener('DOMContentLoaded', () => {
    for (const link of document.querySelectorAll('[data-language-choice]')) {
      const next = link.dataset.languageChoice;
      const target = new URL(location.href);
      target.searchParams.set('lang', next);
      link.href = target.href;
      if (next === lang) link.setAttribute('aria-current','true');
    }
    if (explicit || lang === 'en') {
      for (const link of document.querySelectorAll('[data-keep-language]')) linkLanguage(link, lang);
    }
  });
})();
