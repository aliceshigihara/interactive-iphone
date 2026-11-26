const {openEditorDialog, closeEditorDialog, closeEditorForm, animateEditorSection} = (() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const preparedDialogs = new WeakSet();
  const closing = new WeakMap();
  const folds = new WeakMap();
  const elasticExit = [
    {transform: 'translateY(0) scale(1)', opacity: 1},
    {transform: 'translateY(-3px) scale(1.019, .983)', opacity: 1, offset: .3},
    {transform: 'translateY(13px) scale(.955, .88)', opacity: 0}
  ];

  function openEditorDialog(dialog) {
    if (dialog.open) return;
    if (!preparedDialogs.has(dialog)) {
      dialog.classList.add('editor-elastic');
      dialog.addEventListener('cancel', event => {
        event.preventDefault();
        closeEditorDialog(dialog);
      });
      preparedDialogs.add(dialog);
    }
    dialog.returnValue = '';
    dialog.showModal();
  }

  function exit(panel, finish) {
    if (closing.has(panel)) return closing.get(panel);
    if (reducedMotion.matches || typeof panel.animate !== 'function') {
      finish();
      return Promise.resolve();
    }
    panel.dataset.editorClosing = '';
    const animation = panel.animate(elasticExit, {duration: 235, easing: 'cubic-bezier(.32,.04,.38,1)', fill: 'forwards'});
    const promise = animation.finished.catch(() => {}).then(() => {
      finish();
      animation.cancel();
      delete panel.dataset.editorClosing;
      closing.delete(panel);
    });
    closing.set(panel, promise);
    return promise;
  }

  function closeEditorDialog(dialog, value = '') {
    return dialog.open ? exit(dialog, () => dialog.close(value)) : Promise.resolve();
  }

  function closeEditorForm(host, panel) {
    return exit(panel, () => { if (host.contains(panel)) host.style.display = 'none'; });
  }

  function fold(panel, from, to, expanding, finish) {
    folds.get(panel)?.cancel();
    if (reducedMotion.matches || typeof panel.animate !== 'function' || from === to) {
      finish();
      folds.delete(panel);
      delete panel.dataset.editorFolding;
      return;
    }
    const stretch = Math.min(12, Math.abs(to - from) * .045);
    panel.dataset.editorFolding = '';
    const animation = panel.animate([
      {height: `${from}px`},
      {height: `${expanding ? to + stretch : from + stretch}px`, offset: expanding ? .8 : .22},
      {height: `${to}px`}
    ], {duration: expanding ? 345 : 245, easing: 'cubic-bezier(.26,.1,.26,1)', fill: 'forwards'});
    folds.set(panel, animation);
    animation.finished.then(() => {
      finish();
      animation.cancel();
      folds.delete(panel);
      delete panel.dataset.editorFolding;
    }, () => {});
  }

  function animateEditorSection(panel, expanding) {
    const from = panel.getBoundingClientRect().height;
    folds.get(panel)?.cancel();
    if (expanding) panel.style.display = '';
    const to = expanding ? panel.getBoundingClientRect().height : 0;
    fold(panel, from, to, expanding, () => { if (!expanding) panel.style.display = 'none'; });
  }

  if (!readerMode) {
    document.addEventListener('click', event => {
      const summary = event.target.closest?.('.col summary, .story-drawer summary');
      const details = summary?.parentElement;
      if (!(details instanceof HTMLDetailsElement) || reducedMotion.matches) return;
      event.preventDefault();
      if (folds.has(details)) return;
      const expanding = !details.open;
      const from = details.getBoundingClientRect().height;
      if (expanding) details.open = true;
      const box = getComputedStyle(details);
      const chrome = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((sum, key) => sum + (parseFloat(box[key]) || 0), 0);
      const to = expanding ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + chrome;
      fold(details, from, to, expanding, () => { details.open = expanding; });
    });

    const dialog = document.getElementById('lock-notifications');
    const launch = document.getElementById('lock-notifications-launch');
    const notices = document.getElementById('lock-preview-notices');
    const layout = dialog.querySelector('.lock-notifications-layout');
    const tabs = [...dialog.querySelectorAll('[data-lock-view]')];
    const contactChoice = $('#notification-title-contact'), title = $('#ntt'), appChoice = $('#na');
    let savedPage = 0;
    const shortcuts = $('#lk .lk2').cloneNode(true);
    shortcuts.querySelector('span')?.remove();
    shortcuts.setAttribute('aria-hidden', 'true');
    $('#lock-preview-wallpaper').append(shortcuts);
    function refreshTitleContacts() {
      const app = appChoice.value;
      const contacts = S.chars.map(person => [`contact:${person.id}`,person.name]);
      if (isMessenger(app)) {
        for (const chat of activeChatsFor(app)) {
          if (chat.mem.length > 1) contacts.push([`${app}:${chat.id}`,cname(chat)]);
        }
      }
      const options = contacts.filter(([,name]) => typeof name === 'string' && name.trim());
      const selected = contactChoice.value;
      contactChoice.replaceChildren(
        new Option(SiteLanguage.text('Escrever um título','Write a title'),''),
        ...options.map(([id,name])=>new Option(name.trim(),id))
      );
      contactChoice.value = options.some(([id])=>id===selected)?selected:'';
      contactChoice.closest('label').hidden = !options.length;
    }
    window.refreshNotificationPreview = () => {
      if (!dialog.open) return;
      $('#lock-preview-date').textContent = S.date;
      $('#lock-preview-time').textContent = sT();
      $('#lock-preview-wallpaper').style.background = $('#lk').style.background;
      const n = notificationDraft();
      $('#lock-notification-contact').hidden = !chatNotificationApps.has(n.app);
      const draft = n.title || n.body ? {...n, title: n.title || 'Título da notificação', draft: true, hasContact: !!(n.contact || n.title)} : null;
      renderLockNotices(notices, draft);
      if (draft) notices.scrollTop = 0;
    };
    window.refreshSavedNotices = () => {
      const rows = [...$('#nl').querySelectorAll('.cr')], pages = Math.max(1, Math.ceil(rows.length / 2));
      savedPage = Math.min(savedPage, pages - 1);
      rows.forEach((row, i) => { row.hidden = Math.floor(i / 2) !== savedPage; });
      $('.lock-notification-pagination').hidden = pages < 2;
      $('#lock-saved-page').textContent = `${savedPage + 1} / ${pages}`;
      $('#lock-saved-prev').disabled = savedPage === 0;
      $('#lock-saved-next').disabled = savedPage === pages - 1;
    };
    function showTab(value) {
      layout.dataset.lockTab = value;
      for (const button of tabs) button.setAttribute('aria-pressed', String(button.dataset.lockView === value));
    }
    tabs.forEach(button => button.addEventListener('click', () => showTab(button.dataset.lockView)));
    $('#lock-saved-prev').onclick = () => { savedPage = Math.max(0, savedPage - 1); refreshSavedNotices(); };
    $('#lock-saved-next').onclick = () => { savedPage++; refreshSavedNotices(); };
    launch.addEventListener('click', () => {
      savedPage = 0;
      showTab('edit');
      refreshTitleContacts();
      openEditorDialog(dialog);
      refreshNotificationPreview();
      refreshSavedNotices();
      notices.scrollTop = 0;
    });
    $('#lock-notifications-form').addEventListener('submit', () => {
      if ($('#ntt').value) return;
      savedPage = 0;
      refreshSavedNotices();
    });
    $('#lock-notifications-close').addEventListener('click', () => closeEditorDialog(dialog));
    appChoice.addEventListener('input',refreshTitleContacts);
    contactChoice.addEventListener('input', () => {
      if (contactChoice.value) title.value = contactChoice.selectedOptions[0].textContent;
      title.setCustomValidity('');
    });
    title.addEventListener('input', event => event.target.setCustomValidity(''));
    $('#lock-notifications-form').addEventListener('input', refreshNotificationPreview);
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeEditorDialog(dialog);
    });
  }

  return {openEditorDialog, closeEditorDialog, closeEditorForm, animateEditorSection};
})();
