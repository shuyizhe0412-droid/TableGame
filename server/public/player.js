/**
 * 桌游AI教练 - 玩家端逻辑
 * 支持扫码模式（storeId+gameId）和浏览模式（仅storeId）
 */
(function () {
  'use strict';

  var API_BASE = window.location.origin + '/api';

  /* ============ DOM 引用 ============ */
  var $ = function (sel) { return document.querySelector(sel); };

  var els = {
    headerBackBtn: $('#header-back-btn'),
    shopName: $('#shop-name'),

    browseView: $('#browse-view'),
    searchInput: $('#search-input'),
    filterTags: $('#filter-tags'),
    gameGrid: $('#game-grid'),
    emptyState: $('#empty-state'),
    loadingState: $('#loading-state'),

    detailView: $('#detail-view'),
    detailCover: $('#detail-cover'),
    detailName: $('#detail-name'),
    detailPlayers: $('#detail-players'),
    detailDuration: $('#detail-duration'),
    detailDifficulty: $('#detail-difficulty'),
    detailTags: $('#detail-tags'),
    detailDesc: $('#detail-desc'),

    chatModeBar: $('#chat-mode-bar'),
    chatMessages: $('#chat-messages'),
    chatLoading: $('#chat-loading'),
    chatInput: $('#chat-input'),
    chatSendBtn: $('#chat-send-btn')
  };

  /* ============ 状态 ============ */
  var state = {
    storeId: null,
    gameId: null,
    shopName: '桌游吧',
    games: [],
    currentCategory: '',
    currentKeyword: '',
    currentMode: 'setup',
    chatHistory: [],
    sessionId: '',
    isStreaming: false,
    streamingBubble: null
  };

  /* ============ 工具函数 ============ */
  function showView(viewName) {
    els.browseView.style.display = viewName === 'browse' ? '' : 'none';
    els.detailView.style.display = viewName === 'detail' ? '' : 'none';
    els.headerBackBtn.style.display = viewName === 'detail' ? '' : 'none';
  }

  function apiGet(path) {
    return fetch(API_BASE + path).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function apiPost(path, body) {
    return fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ============ URL 参数解析 ============ */
  function parseParams() {
    var params = new URLSearchParams(window.location.search);
    state.storeId = params.get('storeId') || params.get('shopId') || null;
    state.gameId = params.get('gameId') || null;
    state.sessionId = 'sess_' + Math.random().toString(36).slice(2, 10);
  }

  /* ============ 店铺信息 ============ */
  function loadShopInfo() {
    if (!state.storeId) {
      els.shopName.textContent = '桌游AI教练';
      return Promise.resolve();
    }
    return apiGet('/public/shop/' + encodeURIComponent(state.storeId))
      .then(function (data) {
        state.shopName = data.store_name || '桌游吧';
        els.shopName.textContent = state.shopName;
      })
      .catch(function () {
        els.shopName.textContent = '桌游吧';
      });
  }

  /* ============ 游戏列表（浏览模式） ============ */
  function loadGames() {
    els.loadingState.style.display = '';
    els.emptyState.style.display = 'none';
    els.gameGrid.innerHTML = '';

    if (!state.storeId) {
      els.loadingState.style.display = 'none';
      els.emptyState.style.display = '';
      els.emptyState.querySelector('p').textContent = '请扫描桌上二维码进入';
      return;
    }

    return apiGet('/public/games/' + encodeURIComponent(state.storeId))
      .then(function (games) {
        state.games = games || [];
        renderGameGrid();
      })
      .catch(function () {
        state.games = [];
        renderGameGrid();
      });
  }

  function filterGames() {
    var filtered = state.games;
    if (state.currentKeyword) {
      var kw = state.currentKeyword.toLowerCase();
      filtered = filtered.filter(function (g) {
        var name = (g.name || '').toLowerCase();
        var tags = (g.tags || '').toLowerCase();
        return name.indexOf(kw) !== -1 || tags.indexOf(kw) !== -1;
      });
    }
    if (state.currentCategory && state.currentCategory !== '全部') {
      filtered = filtered.filter(function (g) {
        var tags = (g.tags || '');
        return tags.indexOf(state.currentCategory) !== -1;
      });
    }
    return filtered;
  }

  function renderGameGrid() {
    els.loadingState.style.display = 'none';
    var filtered = filterGames();

    if (filtered.length === 0) {
      els.gameGrid.innerHTML = '';
      els.emptyState.style.display = '';
      els.emptyState.querySelector('p').textContent =
        state.games.length === 0 ? '该店铺暂无桌游' : '没有匹配的桌游';
      return;
    }

    els.emptyState.style.display = 'none';
    els.gameGrid.innerHTML = filtered.map(function (g) {
      var diffStars = g.difficulty
        ? '<span class=\'stars\'>' + '\u2605'.repeat(Math.min(g.difficulty, 5)) + '\u2606'.repeat(Math.max(0, 5 - g.difficulty)) + '</span>'
        : '';
      return (
        '<div class="game-card" data-id="' + g.id + '">' +
          '<div class="card-cover">' +
            (g.cover_image
              ? '<img src="' + escapeHtml(g.cover_image) + '" alt="' + escapeHtml(g.name) + '" loading="lazy">'
              : '\uD83C\uDFB2') +
          '</div>' +
          '<div class="card-body">' +
            '<div class="card-title">' + escapeHtml(g.name) + '</div>' +
            '<div class="card-meta">' +
              (g.min_players && g.max_players ? '<span>\uD83D\uDC65 ' + g.min_players + '-' + g.max_players + '人</span>' : '') +
              (g.duration ? '<span>\u23F1 ' + g.duration + '分钟</span>' : '') +
              (diffStars ? diffStars : '') +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    // 绑定点击
    var cards = els.gameGrid.querySelectorAll('.game-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        openGameDetail(this.dataset.id);
      });
    }
  }

  /* ============ 游戏详情（扫码模式） ============ */
  function openGameDetail(gameId) {
    state.gameId = gameId;
    // 更新 URL 不带刷新
    var url = new URL(window.location);
    url.searchParams.set('gameId', gameId);
    window.history.replaceState({}, '', url);

    showView('detail');
    loadGameDetail();
    initChat();
    recordScan();
  }

  function loadGameDetail() {
    if (!state.gameId) return;
    return apiGet('/public/game/' + encodeURIComponent(state.gameId))
      .then(function (game) {
        renderGameDetail(game);
      })
      .catch(function () {
        els.detailName.textContent = '加载失败';
      });
  }

  function renderGameDetail(game) {
    // 封面
    if (game.cover_image) {
      els.detailCover.innerHTML = '<img src="' + escapeHtml(game.cover_image) + '" alt="' + escapeHtml(game.name) + '">';
    } else {
      els.detailCover.innerHTML = '<div class="cover-placeholder">\uD83C\uDFB2</div>';
    }

    els.detailName.textContent = game.name || '';
    els.detailPlayers.textContent = '\uD83D\uDC65 ' +
      (game.min_players && game.max_players ? game.min_players + '-' + game.max_players + '人' : '--');
    els.detailDuration.textContent = '\u23F1 ' +
      (game.duration ? game.duration + '分钟' : '--');

    var diff = game.difficulty || 0;
    els.detailDifficulty.innerHTML = '\uD83D\uDCCA <span class="stars">' +
      '\u2605'.repeat(Math.min(diff, 5)) + '\u2606'.repeat(Math.max(0, 5 - diff)) + '</span>';

    // 标签
    var tags = [];
    if (game.tags) {
      tags = typeof game.tags === 'string' ? game.tags.split(',').map(function (t) { return t.trim(); }) : game.tags;
    }
    els.detailTags.innerHTML = tags.map(function (t) {
      return '<span class="tag-chip">' + escapeHtml(t) + '</span>';
    }).join('');

    // 简介
    els.detailDesc.textContent = game.description || game.rules_text ? (game.description || game.rules_text || '').slice(0, 200) : '';
  }

  function recordScan() {
    if (!state.gameId || !state.storeId) return;
    apiPost('/public/scan', {
      game_id: state.gameId,
      shop_id: state.storeId
    }).catch(function () {
      // 静默失败，扫码记录不影响用户体验
    });
  }

  /* ============ AI 对话 ============ */
  function initChat() {
    // 模式切换
    var modeBtns = els.chatModeBar.querySelectorAll('.chat-mode-btn');
    for (var i = 0; i < modeBtns.length; i++) {
      modeBtns[i].addEventListener('click', function () {
        var btns = els.chatModeBar.querySelectorAll('.chat-mode-btn');
        for (var j = 0; j < btns.length; j++) { btns[j].classList.remove('active'); }
        this.classList.add('active');
        state.currentMode = this.dataset.mode;
      });
    }

    // 发送按钮
    els.chatSendBtn.addEventListener('click', sendUserMessage);
    els.chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage();
      }
    });

    // 加载历史
    loadChatHistory().then(function () {
      // 清空欢迎语如果已有历史
      if (state.chatHistory.length > 0) {
        var welcome = els.chatMessages.querySelector('.chat-welcome');
        if (welcome) welcome.remove();
      }
    });
  }

  function loadChatHistory() {
    return apiGet('/public/conversations/' + state.sessionId)
      .then(function (msgs) {
        if (!msgs || msgs.length === 0) return;
        for (var i = 0; i < msgs.length; i++) {
          appendBubble(msgs[i].role, msgs[i].content, false);
          state.chatHistory.push({ role: msgs[i].role, content: msgs[i].content });
        }
      })
      .catch(function () {
        // 无历史记录，正常
      });
  }

  function sendUserMessage() {
    var text = els.chatInput.value.trim();
    if (!text || state.isStreaming) return;
    els.chatInput.value = '';

    appendBubble('user', text, true);
    state.chatHistory.push({ role: 'user', content: text });
    saveMessage('user', text);

    // AI 流式回复
    state.isStreaming = true;
    els.chatSendBtn.disabled = true;
    els.chatLoading.style.display = '';

    var fullContent = '';
    state.streamingBubble = appendBubble('assistant', '', false);
    state.streamingBubble.classList.add('streaming');

    streamAI(text, state.currentMode)
      .then(function () {
        // 完成
        state.streamingBubble.classList.remove('streaming');
        state.chatHistory.push({ role: 'assistant', content: fullContent });
        saveMessage('assistant', fullContent);
        state.isStreaming = false;
        els.chatSendBtn.disabled = false;
        els.chatLoading.style.display = 'none';
        state.streamingBubble = null;
      })
      .catch(function (err) {
        state.streamingBubble.textContent = '\u274C 回复失败: ' + (err.message || '网络错误');
        state.streamingBubble.classList.remove('streaming');
        state.isStreaming = false;
        els.chatSendBtn.disabled = false;
        els.chatLoading.style.display = 'none';
        state.streamingBubble = null;
      });
  }

  function streamAI(question, mode) {
    return fetch(API_BASE + '/ai/ask-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: state.gameId,
        question: question,
        mode: mode,
        history: state.chatHistory.slice(0, -1) // 排除刚发的这条
      })
    }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';

      return new Promise(function (resolve, reject) {
        function read() {
          reader.read().then(function (result) {
            if (result.done) {
              // 处理残留 buffer
              if (buffer.trim()) {
                processSSEBuffer(buffer);
              }
              resolve();
              return;
            }
            buffer += decoder.decode(result.value, { stream: true });
            // SSE 消息以 \n\n 分隔
            var parts = buffer.split('\n\n');
            // 最后一段可能不完整，保留
            buffer = parts.pop();
            for (var i = 0; i < parts.length; i++) {
              processSSELine(parts[i]);
            }
            read();
          }).catch(reject);
        }
        read();
      });
    });

    function processSSELine(chunk) {
      var lines = chunk.split('\n');
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('data: ') === 0) {
          try {
            var json = JSON.parse(lines[i].slice(6));
            if (json.content) {
              fullContent += json.content;
              if (state.streamingBubble) {
                state.streamingBubble.textContent = fullContent;
              }
              scrollChatBottom();
            }
            if (json.done) {
              if (json.full) {
                fullContent = json.full;
                if (state.streamingBubble) {
                  state.streamingBubble.textContent = fullContent;
                }
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    function processSSEBuffer(buf) {
      processSSELine(buf);
    }
  }

  function appendBubble(role, content, animate) {
    var div = document.createElement('div');
    div.className = 'chat-bubble ' + role;
    if (animate) div.style.animation = 'fadeUp 0.3s ease';
    div.textContent = content;
    els.chatMessages.appendChild(div);
    scrollChatBottom();
    return div;
  }

  function scrollChatBottom() {
    requestAnimationFrame(function () {
      els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    });
  }

  function saveMessage(role, content) {
    apiPost('/public/conversations', {
      store_id: state.storeId || '',
      game_id: state.gameId || '',
      session_id: state.sessionId,
      role: role,
      content: content
    }).catch(function () {
      // 静默失败
    });
  }

  /* ============ 搜索与筛选（浏览模式） ============ */
  function initSearchAndFilter() {
    // 搜索
    var debounceTimer;
    els.searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        state.currentKeyword = els.searchInput.value.trim();
        renderGameGrid();
      }, 300);
    });

    // 分类标签
    els.filterTags.addEventListener('click', function (e) {
      var tag = e.target.closest('.filter-tag');
      if (!tag) return;
      var btns = els.filterTags.querySelectorAll('.filter-tag');
      for (var i = 0; i < btns.length; i++) { btns[i].classList.remove('active'); }
      tag.classList.add('active');
      state.currentCategory = tag.dataset.cat;
      renderGameGrid();
    });
  }

  /* ============ 返回按钮 ============ */
  function initBackButton() {
    els.headerBackBtn.addEventListener('click', function () {
      state.gameId = null;
      showView('browse');
      // 更新 URL
      var url = new URL(window.location);
      url.searchParams.delete('gameId');
      window.history.replaceState({}, '', url);
      // 滚动到顶部
      window.scrollTo(0, 0);
    });
  }

  /* ============ 入口 ============ */
  function init() {
    parseParams();

    if (!state.storeId) {
      // 无 storeId：尝试从 sessionStorage 恢复
      state.storeId = sessionStorage.getItem('player_storeId');
    } else {
      sessionStorage.setItem('player_storeId', state.storeId);
    }

    initSearchAndFilter();
    initBackButton();

    loadShopInfo().then(function () {
      if (state.gameId) {
        // 扫码模式：直接进入详情
        showView('detail');
        loadGameDetail();
        initChat();
        recordScan();
      } else {
        // 浏览模式
        showView('browse');
        loadGames();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
