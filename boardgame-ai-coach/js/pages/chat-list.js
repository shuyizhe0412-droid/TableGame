/**
 * 桌游AI教练 - AI助手入口页
 * 路由：/chat（无id参数时显示）
 * 功能：游戏搜索、最近使用、快速开始、热门AI学习
 */
App.registerPage('chat-list', (function() {
    // ==================== 状态管理 ====================
    var state = {
        allGames: [],
        searchKeyword: '',
        recentGameIds: [],
        hotGameNames: ['卡坦岛', '狼人杀', '阿瓦隆', '璀璨宝石', 'UNO', '七大奇迹'],
        learningCounts: {}   // 热门游戏的学习人数缓存
    };

    // ==================== 工具函数 ====================
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // 全局跳转辅助：从AI入口页跳转到AI对话（记录来源）
    window.goToChatFromList = function(gameId) {
        sessionStorage.setItem('chatFrom', 'chat-list');
        window.location.hash = '/chat?id=' + gameId;
    };
    window.goToChatModeFromList = function(mode) {
        sessionStorage.setItem('chatFrom', 'chat-list');
        window.location.hash = '/chat?mode=' + mode;
    };

    // 生成随机学习人数
    function getRandomCount(gameName) {
        if (state.learningCounts[gameName]) {
            return state.learningCounts[gameName];
        }
        var counts = ['1.2万', '9800', '1.5万', '8600', '2.1万', '7300', '1.8万', '6500', '3.2万', '5100'];
        var hash = 0;
        for (var i = 0; i < gameName.length; i++) {
            hash = ((hash << 5) - hash) + gameName.charCodeAt(i);
            hash = hash & hash;
        }
        var idx = Math.abs(hash) % counts.length;
        state.learningCounts[gameName] = counts[idx];
        return counts[idx];
    }

    // 从 localStorage 读取最近使用
    function loadRecentGames() {
        try {
            var raw = localStorage.getItem('recentGames');
            if (raw) {
                state.recentGameIds = raw.split(',').filter(function(id) { return id; });
            }
        } catch (e) {
            state.recentGameIds = [];
        }
    }

    // ==================== 渲染函数 ====================

    // 1. 标题区域
    function renderTitle() {
        return '<div class="chat-list-header" style="text-align:center;padding:24px 16px 16px;">' +
            '<div style="font-size:20px;color:#fff;font-weight:700;">🤖 AI桌游助手</div>' +
            '<div style="font-size:14px;color:#888;margin-top:6px;">选一款游戏，我来教你玩</div>' +
            '</div>';
    }

    // 2. 搜索框
    function renderSearchBox() {
        return '<div class="chat-list-search" style="padding:0 16px 16px;">' +
            '<div style="position:relative;">' +
            '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;">🔍</span>' +
            '<input type="text" id="chat-list-search-input" ' +
            'placeholder="搜索想学的桌游..." ' +
            'value="' + escapeHtml(state.searchKeyword) + '" ' +
            'style="width:100%;padding:12px 14px 12px 42px;border:none;border-radius:12px;' +
            'background:#2a2a3e;color:#fff;font-size:14px;outline:none;box-sizing:border-box;">' +
            '</div>' +
            '</div>';
    }

    // 3. 最近使用模块
    function renderRecentSection() {
        var recentGames = [];
        state.recentGameIds.forEach(function(id) {
            var game = state.allGames.find(function(g) {
                return String(g.id) === String(id);
            });
            if (game) recentGames.push(game);
        });

        // 去重，最多取6个
        var seen = {};
        recentGames = recentGames.filter(function(g) {
            if (seen[g.id]) return false;
            seen[g.id] = true;
            return true;
        }).slice(0, 6);

        if (recentGames.length === 0) return '';

        var cards = recentGames.map(function(game) {
            return '<div class="chat-list-game-card" ' +
                'onclick="window.goToChatFromList(\'' + game.id + '\')" ' +
                'style="flex-shrink:0;width:120px;background:#2a2a3e;border-radius:12px;' +
                'padding:12px;cursor:pointer;text-align:center;' +
                'transition:background 0.2s;" ' +
                'onmouseenter="this.style.background=\'#353555\'" ' +
                'onmouseleave="this.style.background=\'#2a2a3e\'">' +
                '<div style="font-size:28px;margin-bottom:6px;">🎲</div>' +
                '<div style="font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(game.name) + '</div>' +
                '<div style="margin-top:8px;padding:6px 0;background:#D4893F;color:#fff;font-size:12px;border-radius:8px;">继续学习</div>' +
                '</div>';
        }).join('');

        return '<div id="chat-list-recent" style="padding:0 16px 16px;">' +
            '<div style="font-size:15px;color:#fff;font-weight:600;margin-bottom:10px;">最近使用</div>' +
            '<div class="chat-list-scroll" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;">' +
            cards +
            '</div>' +
            '</div>';
    }

    // 4. 快速开始模块
    function renderQuickStartSection() {
        var quickItems = [
            { emoji: '🎲', text: '我想学一款新游戏', hash: '/library', isChatMode: false },
            { emoji: '🤔', text: '不知道玩什么？AI帮你选', hash: 'recommend', isChatMode: true },
            { emoji: '⚡', text: '快速查规则', hash: 'quick', isChatMode: true }
        ];

        var cards = quickItems.map(function(item) {
            var onclick = item.isChatMode ?
                'onclick="window.goToChatModeFromList(\'' + item.hash + '\')"' :
                'onclick="window.location.hash=\'' + item.hash + '\'"';
            return '<div class="chat-list-quick-item" ' +
                onclick + ' ' +
                'style="display:flex;align-items:center;background:#2a2a3e;border-radius:12px;' +
                'padding:0 14px;height:56px;cursor:pointer;transition:background 0.2s;" ' +
                'onmouseenter="this.style.background=\'#353555\'" ' +
                'onmouseleave="this.style.background=\'#2a2a3e\'">' +
                '<span style="font-size:24px;margin-right:12px;flex-shrink:0;">' + item.emoji + '</span>' +
                '<span style="font-size:15px;color:#fff;flex:1;">' + item.text + '</span>' +
                '<span style="font-size:14px;color:#666;">›</span>' +
                '</div>';
        }).join('');

        return '<div id="chat-list-quick" style="padding:0 16px 16px;">' +
            '<div style="display:flex;flex-direction:column;gap:10px;">' +
            cards +
            '</div>' +
            '</div>';
    }

    // 5. 热门AI学习模块
    function renderHotSection() {
        // 在allGames中匹配热门游戏名
        var hotGames = [];
        state.hotGameNames.forEach(function(name) {
            var game = state.allGames.find(function(g) {
                return g.name && g.name.indexOf(name) !== -1;
            });
            if (game && !hotGames.find(function(h) { return h.id === game.id; })) {
                hotGames.push(game);
            }
        });

        if (hotGames.length === 0) {
            // 如果没匹配到，用allGames前6个
            hotGames = state.allGames.slice(0, 6);
        }

        var cards = hotGames.map(function(game) {
            var count = getRandomCount(game.name);
            console.log('[chat-list.js] 热门游戏:', game.name, 'id:', game.id);
            return '<div class="chat-list-game-card" ' +
                'onclick="window.goToChatFromList(\'' + game.id + '\')" ' +
                'style="flex-shrink:0;width:120px;background:#2a2a3e;border-radius:12px;' +
                'padding:12px;cursor:pointer;text-align:center;' +
                'transition:background 0.2s;" ' +
                'onmouseenter="this.style.background=\'#353555\'" ' +
                'onmouseleave="this.style.background=\'#2a2a3e\'">' +
                '<div style="font-size:28px;margin-bottom:6px;">🎮</div>' +
                '<div style="font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(game.name) + '</div>' +
                '<div style="font-size:12px;color:#888;margin-top:4px;">' + count + '人正在学</div>' +
                '</div>';
        }).join('');

        return '<div id="chat-list-hot" style="padding:0 16px;">' +
            '<div style="font-size:15px;color:#fff;font-weight:600;margin-bottom:10px;">大家都在学</div>' +
            '<div class="chat-list-scroll" style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;">' +
            cards +
            '</div>' +
            '</div>';
    }

    // ==================== 主渲染函数 ====================
    function render(params) {
        loadRecentGames();

        // 先渲染骨架（搜索框 + 快速开始是静态的，不受数据影响）
        var html = '<div class="chat-list-page" style="min-height:100vh;background:#12122a;padding-bottom:80px;">' +
            renderTitle() +
            renderSearchBox();

        // 最近使用（依赖数据，先尝试渲染）
        html += renderRecentSection();

        // 快速开始（静态）
        html += renderQuickStartSection();

        // 热门（依赖数据，先尝试渲染）
        html += renderHotSection();

        html += '</div>';
        return html;
    }

    // ==================== 搜索过滤 ====================
    var searchTimer = null;
    function onSearchInput() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
            var input = document.getElementById('chat-list-search-input');
            if (input) {
                state.searchKeyword = input.value.trim();
                filterAndRefresh();
            }
        }, 300);
    }

    // 根据搜索关键词过滤并重新渲染动态模块
    function filterAndRefresh() {
        var keyword = state.searchKeyword.toLowerCase();

        if (keyword) {
            // 有搜索关键词时，用过滤结果显示为游戏列表
            var filtered = state.allGames.filter(function(g) {
                return g.name && g.name.toLowerCase().indexOf(keyword) !== -1;
            });

            // 替换"最近使用"和"大家都在学"区域为一个搜索结果显示
            var recentEl = document.getElementById('chat-list-recent');
            var hotEl = document.getElementById('chat-list-hot');
            var resultsEl = document.getElementById('chat-list-search-results');

            // 隐藏最近使用和热门，显示搜索结果
            if (recentEl) recentEl.style.display = 'none';
            if (hotEl) hotEl.style.display = 'none';

            if (filtered.length > 0) {
                var cards = filtered.slice(0, 20).map(function(game) {
                    return '<div ' +
                        'onclick="window.goToChatFromList(\'' + game.id + '\')" ' +
                        'style="display:flex;align-items:center;background:#2a2a3e;border-radius:12px;' +
                        'padding:12px 14px;cursor:pointer;transition:background 0.2s;" ' +
                        'onmouseenter="this.style.background=\'#353555\'" ' +
                        'onmouseleave="this.style.background=\'#2a2a3e\'">' +
                        '<span style="font-size:24px;margin-right:12px;">🎲</span>' +
                        '<span style="font-size:14px;color:#fff;flex:1;">' + escapeHtml(game.name) + '</span>' +
                        '<span style="font-size:12px;color:#888;">' + (game.category || '') + '</span>' +
                        '<span style="font-size:14px;color:#666;margin-left:8px;">›</span>' +
                        '</div>';
                }).join('');

                var resultsHtml = '<div id="chat-list-search-results" style="padding:0 16px 16px;">' +
                    '<div style="font-size:15px;color:#fff;font-weight:600;margin-bottom:10px;">搜索结果 (' + filtered.length + ')</div>' +
                    '<div style="display:flex;flex-direction:column;gap:8px;">' +
                    cards +
                    '</div>' +
                    '</div>';

                if (resultsEl) {
                    resultsEl.outerHTML = resultsHtml;
                } else {
                    // 在快速开始之后插入
                    var quickEl = document.getElementById('chat-list-quick');
                    if (quickEl) {
                        quickEl.insertAdjacentHTML('afterend', resultsHtml);
                    }
                }
            } else {
                if (resultsEl) {
                    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:#888;font-size:14px;">未找到相关游戏</div>';
                } else {
                    var quickEl = document.getElementById('chat-list-quick');
                    if (quickEl) {
                        quickEl.insertAdjacentHTML('afterend',
                            '<div id="chat-list-search-results" style="padding:20px;text-align:center;color:#888;font-size:14px;">未找到相关游戏</div>');
                    }
                }
            }
        } else {
            // 清除搜索，恢复原始视图
            var resultsEl = document.getElementById('chat-list-search-results');
            if (resultsEl) resultsEl.remove();

            var recentEl = document.getElementById('chat-list-recent');
            var hotEl = document.getElementById('chat-list-hot');
            if (recentEl) recentEl.style.display = '';
            if (hotEl) hotEl.style.display = '';
        }
    }

    // ==================== 事件处理 ====================
    function init(params) {
        console.log('[chat-list.js] init 被调用');

        // 加载所有游戏数据
        loadAllGames();

        // 绑定搜索输入事件
        setTimeout(function() {
            var searchInput = document.getElementById('chat-list-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', onSearchInput);
            }
        }, 100);
    }

    function loadAllGames() {
        if (typeof window.getGames !== 'function') {
            console.warn('[chat-list.js] getGames API 未就绪');
            return;
        }

        window.getGames().then(function(games) {
            if (games && games.length > 0) {
                state.allGames = games;
                console.log('[chat-list.js] 加载游戏数量:', games.length);
                // 重新渲染以更新数据相关模块
                refreshDataSections();
            }
        }).catch(function(err) {
            console.error('[chat-list.js] 加载游戏失败:', err);
        });
    }

    // 只刷新数据相关的部分（搜索结果不刷新，保持用户输入状态）
    function refreshDataSections() {
        var recentEl = document.getElementById('chat-list-recent');
        var hotEl = document.getElementById('chat-list-hot');

        // 重新渲染最近使用
        if (recentEl) {
            var newRecent = renderRecentSection();
            // 从 renderRecentSection 提取 div 内容（去掉外层 padding div）
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = newRecent;
            var newContent = tempDiv.firstChild;
            if (newContent && state.recentGameIds.length > 0) {
                recentEl.innerHTML = newContent.innerHTML;
                recentEl.style.display = '';
            } else {
                recentEl.style.display = 'none';
            }
        } else {
            // 如果元素不存在，需要插入
            var page = document.querySelector('.chat-list-page');
            if (page) {
                var titleEl = page.querySelector('.chat-list-header');
                var newRecent = renderRecentSection();
                if (newRecent) {
                    var searchEl = page.querySelector('.chat-list-search');
                    if (searchEl) {
                        var wrapper = document.createElement('div');
                        wrapper.innerHTML = newRecent;
                        var node = wrapper.firstChild;
                        searchEl.insertAdjacentHTML('afterend', newRecent);
                    }
                }
            }
        }

        // 重新渲染热门
        if (hotEl) {
            var newHot = renderHotSection();
            var tempDiv2 = document.createElement('div');
            tempDiv2.innerHTML = newHot;
            var newHotContent = tempDiv2.firstChild;
            if (newHotContent) {
                hotEl.innerHTML = newHotContent.innerHTML;
                hotEl.style.display = '';
            }
        }
    }

    // ==================== 导出页面对象 ====================
    var page = {
        render: render,
        init: init
    };

    // 全局暴露
    window.chatListPage = page;
    window.chatListPageRender = function() {
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = page.render() + window.getTabBarHtml('chat');
            window.bindTabBarEvents();
            page.init();
        }
    };

    return page;
})());
