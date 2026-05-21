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
            // 预设问题会根据游戏类型动态生成
            quickQuestions: []
        },
        'rules': {
            name: '规则教学',
            icon: '📖',
            welcome: function(gameName) {
                return '你好！让我们一起来学习' + gameName + '的规则。你可以随时问我任何问题，我们一步一步来。';
            },
            quickQuestions: []
        },
        'faq': {
            name: '规则速查',
            icon: '🔍',
            welcome: function(gameName) {
                return '你好！你想查' + gameName + '的什么规则？直接问我就行。';
            },
            quickQuestions: []
        }
    };

    // ==================== 游戏类型预设问题配置 ====================
    // 根据 category 和 tags 判断游戏类型，返回对应的预设问题
    function getQuestionsByGameType(mode, category, tags) {
        category = category || '';
        tags = tags || [];
        var tagsStr = tags.join(',').toLowerCase();

        // 判断游戏类型
        var isCardGame = tagsStr.includes('卡牌') || category === '卡牌' || 
                         tagsStr.includes('纸牌') || tagsStr.includes('牌');
        var isPartyGame = tagsStr.includes('派对') || tagsStr.includes('聚会') || 
                          tagsStr.includes('社交') || category === '聚会';
        var isDeductionGame = tagsStr.includes('推理') || tagsStr.includes('身份') || 
                              tagsStr.includes('狼人') || tagsStr.includes('卧底');
        var isBoardGame = tagsStr.includes('桌游') || tagsStr.includes('版图') || 
                          tagsStr.includes('德式') || tagsStr.includes('美式');

        // 通用预设问题
        var universalQuestions = {
            setup: ['几个人玩？', '游戏流程？', '配件清单？', '怎么开始？'],
            rules: ['核心规则？', '怎么赢？', '基本操作？', '重要提示？'],
            faq: ['获胜条件？', '常见问题？', '注意事项？', '技巧建议？']
        };

        // 桌游/版图类（需要摆盘）
        var boardQuestions = {
            setup: ['几个人玩？', '地图怎么摆？', '配件清单？', '初始放置？'],
            rules: ['怎么获得资源？', '怎么建造？', '怎么赢？', '核心机制？'],
            faq: ['交易规则', '特殊规则', '计分方式', '常见问题']
        };

        // 卡牌类
        var cardQuestions = {
            setup: ['几人能玩？', '怎么发牌？', '初始手牌？', '牌组构成？'],
            rules: ['出牌规则？', '怎么赢？', '获胜条件？', '核心机制？'],
            faq: ['特殊牌效果', '获胜条件', '常见问题', '技巧建议']
        };

        // 派对/聚会类
        var partyQuestions = {
            setup: ['几人能玩？', '角色怎么分配？', '怎么分组？', '初始设置？'],
            rules: ['游戏流程？', '怎么赢？', '淘汰规则？', '胜利条件？'],
            faq: ['常见问题', '角色说明', '注意事项', '技巧建议']
        };

        // 推理/身份类
        var deductionQuestions = {
            setup: ['几人能玩？', '角色怎么分配？', '怎么睁眼？', '初始设置？'],
            rules: ['游戏流程？', '投票规则？', '胜负判定？', '特殊角色？'],
            faq: ['角色能力', '投票规则', '胜负判定', '常见问题']
        };

        // 根据游戏类型选择预设
        if (isDeductionGame) {
            return deductionQuestions[mode] || universalQuestions[mode];
        } else if (isPartyGame) {
            return partyQuestions[mode] || universalQuestions[mode];
        } else if (isCardGame && !isBoardGame) {
            return cardQuestions[mode] || universalQuestions[mode];
        } else if (isBoardGame) {
            return boardQuestions[mode] || universalQuestions[mode];
        }

        return universalQuestions[mode];
    }

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
                gameData: null,         // 保存完整游戏数据
                messages: [],           // 消息列表
                style: 'teacher',       // 语言风格也按会话独立
                welcomeSent: false,     // 是否已发送欢迎语
                loaded: false           // 是否已加载游戏数据
            };
        }
        return chatSessions[key];
    }

    // ==================== 当前页面状态（指向当前会话） ====================
    var state = {
        mode: 'setup',
        gameId: '',
        gameName: '加载中...',
        session: null,   // 当前会话引用
        inputText: '',
        isTyping: false  // AI 正在输入中
    };

    // ==================== 工具函数 ====================
    function getParamFromHash(key) {
        var hash = window.location.hash || '';
        var match = hash.match(new RegExp('[?&]' + key + '=([^&]+)'));
        return match ? decodeURIComponent(match[1]) : null;
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

    // ==================== 从Supabase加载游戏数据 ====================
    async function loadGameData(gameId) {
        console.log('[chat.js] 准备加载游戏数据, gameId:', gameId);
        
        try {
            if (typeof window.getGameDetail !== 'function') {
                throw new Error('API 未加载');
            }
            
            var gameData = await window.getGameDetail(gameId);
            console.log('[chat.js] 游戏数据:', gameData);
            
            if (gameData) {
                // 确保使用正确的 name 字段
                var gameName = gameData.name;
                console.log('[chat.js] 游戏名称 (name字段):', gameName);
                console.log('[chat.js] 游戏分类 (category字段):', gameData.category);
                console.log('[chat.js] 游戏标签 (tags字段):', gameData.tags);
                
                // 更新会话中的游戏数据
                if (state.session) {
                    state.session.gameData = gameData;
                    state.session.gameName = gameName || '未知游戏';
                    state.session.loaded = true;
                    state.gameName = gameName || '未知游戏';
                }
                return gameData;
            } else {
                throw new Error('游戏不存在');
            }
        } catch (error) {
            console.error('[chat.js] 加载游戏数据失败:', error);
            // 使用默认名称
            if (state.session) {
                state.session.gameName = '游戏';
                state.session.loaded = true;
            }
            state.gameName = '游戏';
            return null;
        }
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
        var mode = session.mode;
        
        // 根据游戏类型动态获取预设问题
        var category = session.gameData ? session.gameData.category : '';
        var tags = session.gameData ? (session.gameData.tags || []) : [];
        var questions = getQuestionsByGameType(mode, category, tags);
        
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
        var gameId = (params && params.gameId) ? params.gameId : (getParamFromHash('gameId') || '');

        console.log('[chat.js] render - mode:', mode, 'gameId:', gameId);

        state.mode = mode;
        state.gameId = gameId;

        // 获取或创建对应会话（传入游戏名，每个会话独立）
        state.session = getSession(gameId, mode, state.session ? state.session.gameName : '加载中...');

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
        console.log('[chat.js] init 被调用');
        
        var session = state.session;
        if (!session) {
            console.error('[chat.js] session 不存在');
            return;
        }

        // 异步加载游戏数据
        loadGameData(state.gameId).then(function(gameData) {
            console.log('[chat.js] 游戏数据加载完成, 游戏名称:', session.gameName);
            console.log('[chat.js] 游戏分类:', session.gameData ? session.gameData.category : '未知');
            console.log('[chat.js] 游戏标签:', session.gameData ? session.gameData.tags : '未知');
            
            // 首次进入该会话，发送欢迎语（作为一条 AI 消息）
            if (!session.welcomeSent && session.messages.length === 0) {
                session.welcomeSent = true;
                var modeInfo = modeConfig[session.mode];
                session.messages.push({
                    role: 'assistant',
                    content: modeInfo.welcome(session.gameName)
                });
            }
            
            // 刷新消息显示和快捷问题
            refreshMessages();
            refreshQuickQuestions();
            
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
        });
    }

    // 刷新快捷问题（加载完游戏数据后调用）
    function refreshQuickQuestions() {
        var container = document.querySelector('.chat-quick-questions');
        if (container) {
            container.outerHTML = renderQuickQuestions();
        }
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
                '<div class="chat-bubble chat-bubble-ai">' + modeInfo.welcome(session.gameName) + '</div>' +
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
