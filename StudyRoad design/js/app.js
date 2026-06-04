/* ============================================================
   StudyRoad — App prototype interactivity
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Toast ---------- */
  var toast = $('#toast'), toastT;
  function showToast(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('show'); }, 2000);
  }
  function flashBanner(id) {
    var b = $('#' + id); if (!b) return;
    b.classList.add('show'); setTimeout(function () { b.classList.remove('show'); }, 2600);
  }

  /* ---------- Greeting ---------- */
  (function () {
    var h = new Date().getHours();
    var part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    var g = $('#greeting'); if (g) g.textContent = 'Good ' + part + ', Roy 👋';
  })();

  /* ---------- View switching ---------- */
  var titles = { home: 'Home', ai: 'AI Chatbot', settings: 'Account settings' };
  function setView(view, tab) {
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + view); });
    $$('.side-link').forEach(function (l) {
      var match;
      if (view === 'settings') match = l.dataset.view === 'settings' && l.dataset.tab === tab;
      else match = l.dataset.view === view && !l.dataset.tab;
      l.classList.toggle('active', match);
    });
    $('#topbarTitle').textContent = titles[view] || 'Home';
    if (view === 'settings' && tab) setTab(tab);
    $('#mainScroll').scrollTop = 0;
    closeMobileSidebar();
  }
  $$('.side-link').forEach(function (l) {
    l.addEventListener('click', function () { setView(l.dataset.view, l.dataset.tab || 'profile'); });
  });
  $$('[data-view-jump]').forEach(function (el) {
    el.addEventListener('click', function () { setView(el.dataset.viewJump, el.dataset.tabJump || 'profile'); });
  });

  /* ---------- Settings tabs ---------- */
  function setTab(tab) {
    $$('.settings-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tab); });
    $$('.settings-pane').forEach(function (p) { p.classList.toggle('active', p.id === 'pane-' + tab); });
    $$('.side-link').forEach(function (l) { l.classList.toggle('active', l.dataset.view === 'settings' && l.dataset.tab === tab); });
  }
  $$('.settings-tab').forEach(function (t) { t.addEventListener('click', function () { setTab(t.dataset.tab); }); });

  /* ---------- Sidebar collapse / mobile ---------- */
  var sidebar = $('#sidebar'), overlay = $('#overlay');
  $('#collapseBtn').addEventListener('click', function () {
    if (window.innerWidth <= 760) { sidebar.classList.add('mobile-open'); overlay.classList.add('show'); }
    else { sidebar.classList.toggle('collapsed'); }
  });
  $('#menuBtn').addEventListener('click', function () { sidebar.classList.add('mobile-open'); overlay.classList.add('show'); });
  function closeMobileSidebar() { sidebar.classList.remove('mobile-open'); overlay.classList.remove('show'); }
  overlay.addEventListener('click', closeMobileSidebar);

  /* ---------- Account menu ---------- */
  var acctMenu = $('#acctMenu');
  $('#userTrigger').addEventListener('click', function (e) { e.stopPropagation(); acctMenu.classList.toggle('open'); });
  document.addEventListener('click', function () { acctMenu.classList.remove('open'); });
  acctMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  $$('[data-go]').forEach(function (el) { el.addEventListener('click', function () { location.href = el.dataset.go; }); });

  /* ---------- Profile ---------- */
  $('#saveNameBtn').addEventListener('click', function () {
    var name = $('#nameInput').value.trim() || 'Roy van der Sande';
    $$('.user-name').forEach(function (n) { n.textContent = name; });
    $('.ctx-user-name').textContent = name;
    var initial = name.charAt(0).toUpperCase();
    $$('.user-avatar').forEach(function (a) { a.textContent = initial; });
    flashBanner('profileBanner');
  });

  /* ---------- Security ---------- */
  var newPw = $('#newPw'), pwHint = $('#pwHint');
  newPw.addEventListener('input', function () {
    var ok = newPw.value.length >= 6;
    pwHint.classList.toggle('ok', ok);
    pwHint.querySelector('svg').innerHTML = ok ? '<polyline points="20 6 9 17 4 12"/>' : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
  });
  $('#savePwBtn').addEventListener('click', function () {
    if (newPw.value.length < 6) { showToast('Password must be at least 6 characters'); return; }
    newPw.value = ''; pwHint.classList.remove('ok');
    pwHint.querySelector('svg').innerHTML = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    flashBanner('securityBanner');
  });

  /* ---------- Billing ---------- */
  var planMeta = {
    Starter: { sub: '€4,99 / month · renews Jul 10, 2026' },
    Pro: { sub: '€9,00 / month · renews Jul 10, 2026' },
    Elite: { sub: '€49,99 / month · renews Jul 10, 2026' }
  };
  function setCurrentPlan(plan) {
    $('#currentPlanName').textContent = plan;
    $('#currentPlanSub').textContent = planMeta[plan].sub;
    // Update mini cards
    $$('.plan-mini').forEach(function (card) {
      var isCurrent = card.dataset.plan === plan;
      card.classList.toggle('plan-mini--current', isCurrent);
      var btn = card.querySelector('[data-plan-action]');
      var badge = card.querySelector('.badge');
      if (isCurrent) {
        if (badge) badge.style.display = '';
        btn.disabled = true; btn.textContent = 'Current plan';
        btn.className = 'btn btn-full btn-sm'; btn.style.background = 'var(--gray-100)'; btn.style.color = 'var(--gray-400)';
      } else {
        if (badge) badge.style.display = 'none';
        btn.disabled = false; btn.style.background = ''; btn.style.color = '';
        var order = ['Starter', 'Pro', 'Elite'];
        var up = order.indexOf(card.dataset.plan) > order.indexOf(plan);
        btn.textContent = up ? 'Upgrade' : 'Downgrade';
        btn.className = 'btn btn-full btn-sm ' + (card.dataset.plan === 'Elite' ? 'btn-accent' : 'btn-outline');
      }
    });
  }
  $$('[data-plan-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      setCurrentPlan(btn.dataset.planAction);
      flashBanner('billingBanner');
      showToast('Switched to ' + btn.dataset.planAction);
    });
  });
  $$('[data-portal]').forEach(function (b) { b.addEventListener('click', function () { showToast('Opening Stripe customer portal…'); }); });
  $('#cancelSubBtn').addEventListener('click', function () { showToast('Redirecting to cancel flow…'); });

  /* ---------- Credits ---------- */
  var creditsModal = $('#creditsModal');
  $('#buyCreditsBtn').addEventListener('click', function () { creditsModal.classList.add('open'); });
  $$('[data-close-credits]').forEach(function (b) { b.addEventListener('click', function () { creditsModal.classList.remove('open'); }); });
  $$('.pack').forEach(function (p) {
    p.addEventListener('click', function () {
      var amt = parseInt(p.dataset.credits, 10);
      var cur = parseInt($('#creditsNum').textContent, 10) || 0;
      $('#creditsNum').textContent = cur + amt;
      $$('.side-badge').forEach(function (b) { b.textContent = cur + amt; });
      creditsModal.classList.remove('open');
      flashBanner('creditsBanner');
      showToast('+' + amt + ' credits added');
    });
  });

  /* ---------- Delete account ---------- */
  var deleteModal = $('#deleteModal'), deleteInput = $('#deleteInput'), confirmDelete = $('#confirmDeleteBtn');
  $('#openDeleteBtn').addEventListener('click', function () { deleteModal.classList.add('open'); deleteInput.value = ''; confirmDelete.disabled = true; setTimeout(function () { deleteInput.focus(); }, 100); });
  $$('[data-close-delete]').forEach(function (b) { b.addEventListener('click', function () { deleteModal.classList.remove('open'); }); });
  deleteInput.addEventListener('input', function () { confirmDelete.disabled = deleteInput.value.trim().toLowerCase() !== 'delete'; });
  confirmDelete.addEventListener('click', function () {
    confirmDelete.disabled = true; confirmDelete.textContent = 'Deleting…';
    setTimeout(function () { location.href = 'login.html'; }, 800);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { deleteModal.classList.remove('open'); creditsModal.classList.remove('open'); }
  });

  /* ============================================================
     AI Chatbot
     ============================================================ */
  var chats = [], activeChat = null, currentModel = 'StudyRoad Mini';
  var thread = $('#chatThread'), welcome = $('#chatWelcome'), composer = $('#composer'), sendBtn = $('#sendBtn');
  var history = $('#chatHistory'), chatBarTitle = $('#chatBarTitle'), chatScroll = $('#chatScroll');

  function renderHistory() {
    if (!chats.length) { history.innerHTML = '<p class="chat-empty">No chats yet.<br>Start a new conversation.</p>'; return; }
    var q = ($('#chatSearch').value || '').toLowerCase();
    var list = chats.filter(function (c) { return c.title.toLowerCase().indexOf(q) > -1; });
    if (!list.length) { history.innerHTML = '<p class="chat-empty">No matches.</p>'; return; }
    history.innerHTML = '<p class="chat-history-label">Recent</p>';
    list.forEach(function (c) {
      var el = document.createElement('div');
      el.className = 'chat-item' + (activeChat === c.id ? ' active' : '');
      el.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="chat-item-title"></span>';
      el.querySelector('.chat-item-title').textContent = c.title;
      el.addEventListener('click', function () { openChat(c.id); });
      history.appendChild(el);
    });
  }
  function openChat(id) {
    activeChat = id;
    var c = chats.find(function (x) { return x.id === id; });
    welcome.style.display = 'none'; thread.style.display = 'flex';
    chatBarTitle.textContent = c.title;
    thread.innerHTML = '';
    c.messages.forEach(function (m) { appendMessage(m.role, m.text, false); });
    renderHistory();
    scrollChat();
  }
  function newChat() {
    activeChat = null; thread.innerHTML = ''; thread.style.display = 'none'; welcome.style.display = 'flex';
    chatBarTitle.textContent = 'New chat'; composer.value = ''; autoSize(); sendBtn.disabled = true;
    renderHistory();
  }
  function appendMessage(role, text, animate) {
    var msg = document.createElement('div');
    msg.className = 'msg ' + role;
    var av = role === 'user' ? 'R' : '';
    var mark = role === 'bot'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 17C12 17 12 7 17 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.2 4"/><circle cx="7" cy="17" r="2" fill="white"/><circle cx="17" cy="7" r="2.2" fill="#2b5ce6"/></svg>'
      : 'R';
    msg.innerHTML = '<div class="msg-av">' + mark + '</div><div class="msg-body"><div class="msg-name">' + (role === 'user' ? 'You' : 'StudyRoad AI') + '</div><div class="msg-text"></div></div>';
    msg.querySelector('.msg-text').innerHTML = text;
    thread.appendChild(msg);
    if (animate) scrollChat();
    return msg;
  }
  function scrollChat() { requestAnimationFrame(function () { chatScroll.scrollTop = chatScroll.scrollHeight; }); }

  function botReply(prompt) {
    var p = prompt.toLowerCase();
    if (p.indexOf('roadmap') > -1 || p.indexOf('plan') > -1) {
      return "<p>Great — let's map it out. Here's a balanced 5-day plan for your <strong>biology exam</strong>:</p><p><strong>Mon</strong> · Cell division recap (45 min)<br><strong>Tue</strong> · Genetics — read + 40 flashcards<br><strong>Wed</strong> · Practice questions, chapter 6<br><strong>Thu</strong> · Weak spots review<br><strong>Fri</strong> · Timed mock exam (60 min)</p><p>Want me to add this to your roadmap or adjust the pace?</p>";
    }
    if (p.indexOf('quiz') > -1 || p.indexOf('war') > -1) {
      return "<p><strong>Question 1.</strong> Which event in 1914 is widely seen as the spark that triggered World War I?</p><p>A) The sinking of the Lusitania<br>B) The assassination of Archduke Franz Ferdinand<br>C) The Treaty of Versailles</p><p>Type A, B or C and I'll keep going.</p>";
    }
    if (p.indexOf('tip') > -1) {
      return "<p>Here are 3 tips that work for most exams:</p><p><strong>1. Active recall</strong> — test yourself instead of re-reading.<br><strong>2. Spaced practice</strong> — short sessions across days beat one long cram.<br><strong>3. Past papers</strong> — practice under timed conditions.</p><p>Want a tip tailored to a specific subject?</p>";
    }
    if (p.indexOf('summar') > -1 || p.indexOf('photosynth') > -1) {
      return "<p><strong>Photosynthesis — key points</strong></p><p>• Plants convert light energy into chemical energy (glucose).<br>• Takes place in the chloroplasts, using chlorophyll.<br>• Inputs: CO₂ + water + light → Outputs: glucose + oxygen.<br>• Two stages: light-dependent reactions &amp; the Calvin cycle.</p><p>Want this as flashcards?</p>";
    }
    return "<p>Got it! I can help with that. Could you tell me which subject and what you're working towards (an exam, homework, or just understanding it better)? The more I know, the sharper my plan.</p>";
  }

  function send(text) {
    text = (text || composer.value).trim();
    if (!text) return;
    if (!activeChat) {
      var id = 'c' + Date.now();
      var title = text.length > 38 ? text.slice(0, 38) + '…' : text;
      chats.unshift({ id: id, title: title, messages: [] });
      activeChat = id;
      welcome.style.display = 'none'; thread.style.display = 'flex';
      chatBarTitle.textContent = title;
    }
    var chat = chats.find(function (x) { return x.id === activeChat; });
    chat.messages.push({ role: 'user', text: text });
    appendMessage('user', text, true);
    composer.value = ''; autoSize(); sendBtn.disabled = true; scrollChat();
    renderHistory();
    // Typing indicator
    var typing = appendMessage('bot', '<div class="typing"><span></span><span></span><span></span></div>', true);
    scrollChat();
    setTimeout(function () {
      var reply = botReply(text);
      typing.querySelector('.msg-text').innerHTML = reply;
      chat.messages.push({ role: 'bot', text: reply });
      scrollChat();
    }, 950);
  }

  function autoSize() { composer.style.height = 'auto'; composer.style.height = Math.min(composer.scrollHeight, 180) + 'px'; }
  composer.addEventListener('input', function () { autoSize(); sendBtn.disabled = !composer.value.trim(); });
  composer.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  sendBtn.addEventListener('click', function () { send(); });
  $('#newChatBtn').addEventListener('click', newChat);
  $('#chatSearch').addEventListener('input', renderHistory);
  $$('.chat-chip').forEach(function (chip) { chip.addEventListener('click', function () { send(chip.dataset.prompt); }); });
  $('#chatToggle').addEventListener('click', function () { $('#chatList').classList.toggle('hidden-panel'); });

  // Model selector
  var modelMenu = $('#modelMenu');
  $('#modelBtn').addEventListener('click', function (e) { e.stopPropagation(); modelMenu.classList.toggle('open'); });
  document.addEventListener('click', function () { modelMenu.classList.remove('open'); });
  modelMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  $$('.model-opt').forEach(function (o) {
    o.addEventListener('click', function () {
      currentModel = o.dataset.model; $('#modelName').textContent = currentModel;
      $$('.model-opt').forEach(function (x) { x.classList.toggle('sel', x === o); });
      modelMenu.classList.remove('open');
    });
  });

  renderHistory();

  /* ---------- Deep-link via hash (e.g. app.html#billing) ---------- */
  (function () {
    var h = (location.hash || '').replace('#', '');
    if (['profile', 'security', 'billing', 'credits'].indexOf(h) > -1) setView('settings', h);
    else if (h === 'ai') setView('ai');
  })();
})();
