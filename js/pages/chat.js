/**
 * 桌游AI教练 - AI对话页
 */
App.registerPage('chat', (function() {
    // ==================== 模式配置 ====================
    var modeConfig = {
        'setup': {
            name: '摆盘引导',
            icon: '🎯',
            welcome: function(gameName) {
                return '你好！我是你的摆盘助手。请告诉我你们有几个人玩，我来一步步教你摆放' + gameName + '的配件。';
            },
            quickQuestions: ['几个人玩？', '地图怎么摆？', '配件清单', '初始放置']
        },
        'rules': {
            name: '规则教学',
            icon: '📖',
            welcome: function(gameName) {
                return '你好！让我们一起来学习' + gameName + '的规则。你可以随时问我任何问题，我们一步一步来。';
            },
            quickQuestions: ['怎么获得资源？', '怎么建造？', '怎么赢？', 'robber规则']
        },
        'faq': {
            name: '规则速查',
            icon: '🔍',
            welcome: function(gameName) {
                return '你好！你想查' + gameName + '的什么规则？直接问我就行。';
            },
            quickQuestions: ['交易规则', '发展卡效果', '港口规则', '计分规则']
        }
    };

    // 语言风格配置
    var styleConfig = {
        'teacher': { icon: '👨‍🏫', name: '正经老师', prefix: '【老师模式】' },
        'friend': { icon: '🤗', name: '热情朋友', prefix: '【朋友模式】' },
        'dict': { icon: '📖', name: '简洁字典', prefix: '【字典模式】' }
    };

    // ==================== 全局会话存储 ====================
    // 按 key = `${gameId}_${mode}` 隔离每个游戏+模式的对话
    var chatSessions = {};

    // 获取或创建会话
    function getSession(gameId, mode, gameName) {
        var key = gameId + '_' + mode;
        if (!chatSessions[key]) {
            chatSessions[key] = {
                gameId: gameId,
                mode: mode,
                gameName: gameName,     // 每个会话独立保存游戏名
                messages: [],           // 消息列表
                style: 'teacher',       // 语言风格也按会话独立
                welcomeSent: false      // 是否已发送欢迎语
            };
        }
        return chatSessions[key];
    }

    // ==================== 当前页面状态（指向当前会话） ====================
    var state = {
        mode: 'setup',
        gameId: '1',
        gameName: '卡坦岛',
        session: null,   // 当前会话引用
        inputText: '',
        isTyping: false  // AI 正在输入中
    };

    // ==================== 工具函数 ====================
    // 从 API 获取游戏名称
    var cachedGames = {};

    function getGameById(id) {
        return cachedGames[id] || { id: id, name: '游戏' + id };
    }

    function loadGameName(gameId) {
        return getGameDetail(gameId)
            .then(function(game) {
                if (game) {
                    cachedGames[gameId] = game;
                    return game.name;
                }
                return '游戏' + gameId;
            })
            .catch(function() {
                return '游戏' + gameId;
            });
    }

    function getParamFromHash(key) {
        var hash = window.location.hash || '';
        var match = hash.match(new RegExp('[?&]' + key + '=([^&]+)'));
        return match ? match[1] : null;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }

    // 发送消息到 AI 并获取回复
    function sendToAI(userMessage) {
        var session = state.session;
        // 构建消息历史（排除欢迎语，只取用户和AI对话）
        var historyMessages = session.messages
            .filter(function(msg) { return msg.role !== 'system'; })
            .map(function(msg) { return { role: msg.role, content: msg.content }; });

        // 调用 DeepSeek API
        aiChat(historyMessages, session.gameName, session.mode, session.style)
            .then(function(response) {
                session.messages.push({
                    role: 'assistant',
                    content: response
                });
                state.isTyping = false;
                refreshMessages();
            })
            .catch(function(error) {
                console.error('AI 回复失败:', error);
                state.isTyping = false;
                // 显示错误消息
                var errorEl = document.querySelector('.chat-typing-indicator');
                if (errorEl) errorEl.remove();
                var messagesEl = document.querySelector('.chat-messages');
                if (messagesEl) {
                    messagesEl.innerHTML += '<div class="chat-message chat-message-ai">' +
                        '<div class="chat-avatar">🤖</div>' +
                        '<div class="chat-bubble chat-bubble-ai">抱歉，AI 暂时无法回复，请检查网络后重试。</div>' +
                        '</div>';
                    messagesEl.scrollTop = messagesEl.scrollHeight;
                }
            });
    }

    // ==================== 渲染函数 ====================
    // 渲染顶部栏
    function renderHeader() {
        var session = state.session;
        var modeInfo = modeConfig[session.mode];
        var styleInfo = styleConfig[session.style];
        return '<div class="chat-header">' +
            '<span class="chat-back" onclick="chatPage.goBack()">← 返回</span>' +
            '<span class="chat-mode-name">' + modeInfo.icon + ' ' + modeInfo.name + '</span>' +
            '<span class="chat-style-btn" onclick="chatPage.toggleStyle()" title="' + styleInfo.name + '">' + styleInfo.icon + '</span>' +
            '</div>';
    }

    // 渲染消息气泡
    function renderMessage(msg) {
        if (msg.role === 'user') {
            return '<div class="chat-message chat-message-user">' +
                '<div class="chat-bubble chat-bubble-user">' + escapeHtml(msg.content) + '</div>' +
                '</div>';
        } else {
            return '<div class="chat-message chat-message-ai">' +
                '<div class="chat-avatar">🤖</div>' +
                '<div class="chat-bubble chat-bubble-ai">' + escapeHtml(msg.content) + '</div>' +
                '</div>';
        }
    }

    // 渲染加载动画
    function renderTypingIndicator() {
        return '<div class="chat-message chat-message-ai" id="chat-typing">' +
            '<div class="chat-avatar">🤖</div>' +
            '<div class="chat-bubble chat-bubble-ai chat-typing-indicator">' +
            '<span></span><span></span><span></span>' +
            '</div>' +
            '</div>';
    }

    // 渲染聊天消息区域
    function renderMessages() {
        var session = state.session;
        var modeInfo = modeConfig[session.mode];
        var html = '<div class="chat-messages" id="chat-messages">';

        if (session.messages.length === 0) {
            // 无消息时显示欢迎语
            html += '<div class="chat-message chat-message-ai">' +
                '<div class="chat-avatar">🤖</div>' +
                '<div class="chat-bubble chat-bubble-ai">' + modeInfo.welcome(state.gameName) + '</div>' +
                '</div>';
        } else {
            session.messages.forEach(function(msg) {
                html += renderMessage(msg);
            });
        }

        if (state.isTyping) {
            html += renderTypingIndicator();
        }

        html += '</div>';
        return html;
    }

    // 渲染快捷问题
    function renderQuickQuestions() {
        var session = state.session;
        var modeInfo = modeConfig[session.mode];
        var questions = modeInfo.quickQuestions;
        var html = '<div class="chat-quick-questions">' +
            '<div class="chat-quick-scroll">';

        questions.forEach(function(q) {
            html += '<button class="chat-quick-btn" onclick="chatPage.sendQuick(\'' + escapeHtml(q) + '\')">' + q + '</button>';
        });

        html += '</div></div>';
        return html;
    }

    // 渲染底部输入区域
    function renderInputArea() {
        return '<div class="chat-input-area">' +
            renderQuickQuestions() +
            '<div class="chat-input-row">' +
            '<input type="text" class="chat-input" id="chat-input" ' +
            'placeholder="输入你的问题..." value="' + escapeHtml(state.inputText) + '" ' +
            'onkeydown="chatPage.handleKeyDown(event)">' +
            '<button class="chat-send-btn" onclick="chatPage.sendMessage()">➤</button>' +
            '</div>' +
            '</div>';
    }

    // 主渲染函数
    function render(params) {
        // 解析 mode 和 gameId
        var mode = (params && params.mode) ? params.mode : (getParamFromHash('mode') || 'setup');
        var gameId = (params && params.gameId) ? params.gameId : (getParamFromHash('gameId') || '1');

        state.mode = mode;
        state.gameId = gameId;

        // 获取游戏名称（从缓存或设置默认值）
        var game = getGameById(gameId);
        state.gameName = game.name;

        // 获取或创建对应会话（传入游戏名，每个会话独立）
        state.session = getSession(gameId, mode, state.gameName);

        // 异步加载游戏名称（用于首次进入）
        loadGameName(gameId).then(function(name) {
            if (state.gameName !== name) {
                state.gameName = name;
                state.session.gameName = name;
                // 更新会话标题
                var headerEl = document.querySelector('.chat-mode-name');
                if (headerEl) {
                    var modeInfo = modeConfig[state.session.mode];
                    headerEl.textContent = modeInfo.icon + ' ' + modeInfo.name;
                }
            }
        });

        return '<div class="chat-page">' +
            renderHeader() +
            '<div class="chat-body">' +
            renderMessages() +
            '</div>' +
            renderInputArea() +
            '</div>';
    }

    // ==================== 事件处理 ====================
    function init(params) {
        var session = state.session;

        // 首次进入该会话，发送欢迎语（作为一条 AI 消息）
        if (!session.welcomeSent && session.messages.length === 0) {
            session.welcomeSent = true;
            var modeInfo = modeConfig[session.mode];
            session.messages.push({
                role: 'assistant',
                content: modeInfo.welcome(state.gameName)
            });
            // 重新渲染以显示欢迎语
            setTimeout(function() {
                refreshMessages();
            }, 50);
        }

        // 初始化输入框
        setTimeout(function() {
            var input = document.getElementById('chat-input');
            if (input) {
                input.focus();
                var len = input.value.length;
                input.setSelectionRange(len, len);
            }
            scrollToBottom();
        }, 100);
    }

    function goBack() {
        window.location.hash = '/detail?id=' + state.gameId;
    }

    function toggleStyle() {
        var session = state.session;
        var styles = ['teacher', 'friend', 'dict'];
        var currentIndex = styles.indexOf(session.style);
        session.style = styles[(currentIndex + 1) % styles.length];
        window.chatPageRender();
    }

    function sendMessage() {
        var input = document.getElementById('chat-input');
        if (!input) return;

        var text = input.value.trim();
        if (!text) return;

        var session = state.session;

        // 添加用户消息到当前会话
        session.messages.push({
            role: 'user',
            content: text
        });

        input.value = '';
        state.inputText = '';

        refreshMessages();
        simulateAIResponse(text);
    }

    function sendQuick(question) {
        var session = state.session;

        session.messages.push({
            role: 'user',
            content: question
        });

        refreshMessages();
        simulateAIResponse(question);
    }

    function simulateAIResponse(userMessage) {
        state.isTyping = true;
        appendTypingIndicator();
        sendToAI(userMessage);
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    // ==================== 辅助函数 ====================
    function refreshMessages() {
        var session = state.session;
        var messagesEl = document.getElementById('chat-messages');
        if (!messagesEl) return;

        messagesEl.innerHTML = '';

        if (session.messages.length === 0) {
            var modeInfo = modeConfig[session.mode];
            messagesEl.innerHTML = '<div class="chat-message chat-message-ai">' +
                '<div class="chat-avatar">🤖</div>' +
                '<div class="chat-bubble chat-bubble-ai">' + modeInfo.welcome(state.gameName) + '</div>' +
                '</div>';
        } else {
            session.messages.forEach(function(msg) {
                messagesEl.innerHTML += renderMessage(msg);
            });
        }

        if (state.isTyping) {
            messagesEl.innerHTML += renderTypingIndicator();
        }

        scrollToBottom();
    }

    function appendTypingIndicator() {
        var messagesEl = document.getElementById('chat-messages');
        if (messagesEl) {
            messagesEl.innerHTML += renderTypingIndicator();
            scrollToBottom();
        }
    }

    function scrollToBottom() {
        setTimeout(function() {
            var messagesEl = document.getElementById('chat-messages');
            if (messagesEl) {
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }
        }, 50);
    }

    // ==================== 导出页面对象 ====================
    var page = {
        render: render,
        init: init,
        goBack: goBack,
        toggleStyle: toggleStyle,
        sendMessage: sendMessage,
        sendQuick: sendQuick,
        handleKeyDown: handleKeyDown
    };

    // 全局暴露
    window.chatPage = page;
    window.chatPageRender = function() {
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = page.render();
            window.bindTabBarEvents();
            page.init();
        }
    };

    return page;
})());
