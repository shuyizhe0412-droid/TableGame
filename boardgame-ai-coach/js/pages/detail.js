/**
 * 桌游AI教练 - 游戏详情页
 */
App.registerPage('detail', (function() {
    // ==================== 模拟数据 ====================
    var mockGames = {
        '1': {
            id: '1',
            name: '卡坦岛',
            nameEn: 'Catan',
            cover: '',
            minPlayers: 3,
            maxPlayers: 4,
            duration: 90,
            difficulty: 2,
            category: '德式',
            tags: ['策略', '资源管理', '交易'],
            description: '卡坦岛是一款经典的德式桌游，玩家扮演殖民者，在卡坦岛上建立殖民地、收集资源、与其他玩家交易，最终成为最富有的殖民者。游戏融合了策略思考与社交互动，每一次开局都是全新的挑战。',
            rules: '1. 游戏轮流进行，每回合掷两颗骰子确定公共资源。2. 拥有与骰子点数对应格子的玩家获得资源。3. 玩家可用资源建造道路、 settlements、城市或购买开发卡。4. 最先获得10分的玩家获胜。',
            setupSteps: ['1. 将六边形地形板块洗匀，排列成六边形', '2. 将数字标记随机放在每个板块上', '3. 将港口标记放在岛屿边缘', '4. 每位玩家选择颜色，获得2个定居点、2条道路', '5. 将起始定居点放在板块角落，获得相应资源'],
            faq: [
                { q: '如果没有对应资源怎么办？', a: '可以与拥有该资源的玩家交易，或使用港口以2:1比例兑换。' },
                { q: '最长道路怎么计算？', a: '连续5条以上道路，每段道路必须相连且不能经过城市。' },
                { q: '开发卡有什么类型？', a: '骑士卡（移动强盗）、进度卡（道路建设、垄断、丰收）、胜利点卡。' }
            ],
            ratings: { difficulty: 3, fun: 4.5, replay: 5,上手: 4 },
            comments: [
                { user: '桌游达人', avatar: '', rating: 5, tags: ['经典', '策略'], content: '德式桌游入门必玩！策略性很强，每次玩都有新发现。交易环节是最大的乐趣所在。' },
                { user: '小明', avatar: '', rating: 4, tags: ['聚会', '互动'], content: '和朋友一起玩很开心，就是需要4个人才好玩。' }
            ]
        },
        '2': {
            id: '2',
            name: '狼人杀',
            nameEn: 'Werewolf',
            cover: '',
            minPlayers: 6,
            maxPlayers: 12,
            duration: 30,
            difficulty: 1,
            category: '聚会',
            tags: ['推理', '社交', '嘴炮'],
            description: '狼人杀是一款经典的社交推理游戏，玩家分为狼人和村民两个阵营。狼人在夜晚击杀村民，村民则在白天通过讨论和投票找出狼人。游戏考验玩家的逻辑推理和语言表达能力。',
            rules: '1. 游戏分为夜晚和白天两个阶段。2. 夜晚狼人睁眼杀人，女巫可以选择救人或毒人。3. 白天玩家自由讨论并投票放逐嫌疑人。4. 狼人全部死亡村民获胜，村民全部死亡狼人获胜。',
            setupSteps: ['1. 根据玩家人数确定角色配置', '2. 发牌决定每位玩家的身份', '3. 指定法官位', '4. 游戏开始，天黑请闭眼'],
            faq: [
                { q: '多少人才好玩？', a: '建议6-12人，人太少狼人胜率太高，人太多节奏太慢。' },
                { q: '新手适合什么角色？', a: '建议先玩村民，比较好上手。' }
            ],
            ratings: { difficulty: 2, fun: 4.8, replay: 5,上手: 4.5 },
            comments: [
                { user: '推理爱好者', avatar: '', rating: 5, tags: ['推理', '烧脑'], content: '逻辑推理的巅峰！和朋友一起玩笑到肚子疼。' }
            ]
        },
        '3': {
            id: '3',
            name: '三国杀',
            nameEn: 'Sanguosha',
            cover: '',
            minPlayers: 4,
            maxPlayers: 10,
            duration: 40,
            difficulty: 2,
            category: '聚会',
            tags: ['角色', '对抗', '策略'],
            description: '三国杀是一款以三国时期为背景的卡牌对战游戏。玩家扮演三国时期的文臣武将，使用身份牌决定阵营，通过出牌、技能和配合来击败对手。',
            rules: '1. 玩家获得随机身份，主公需要消灭反贼和内奸。2. 每个武将拥有独特技能。3. 回合内可以出杀、闪、酒等牌。4. 血量归零则死亡。',
            setupSteps: ['1. 根据人数选择身份牌', '2. 玩家抽取武将牌', '3. 每人获得初始手牌', '4. 主公亮明身份'],
            faq: [
                { q: '怎么算赢？', a: '主公杀死所有反贼和内奸获胜；反贼杀死主公获胜；内奸杀死所有人获胜。' }
            ],
            ratings: { difficulty: 3, fun: 4.3, replay: 4.5,上手: 3.5 },
            comments: []
        },
        '4': {
            id: '4',
            name: '情书',
            nameEn: 'Love Letter',
            cover: '',
            minPlayers: 2,
            maxPlayers: 6,
            duration: 15,
            difficulty: 1,
            category: '入门',
            tags: ['卡牌', '推理', '小品'],
            description: '情书是一款轻度的卡牌推理游戏。玩家扮演追求公主的人，通过出牌推测其他玩家手牌，最终让公主收到自己的情书。游戏规则简单但策略性十足。',
            rules: '1. 从牌堆顶抽一张牌，与手牌二选一出牌。2. 不同的牌有不同的效果。3. 被Guard指定并猜中手牌则出局。4. 存活到最后的玩家比较手牌大小。',
            setupSteps: ['1. 将16张牌洗匀', '2. 根据人数移除部分牌', '3. 每位玩家抽一张牌作为手牌'],
            faq: [
                { q: '人数不同会影响游戏吗？', a: '会，人数不同需要移除的牌不同，游戏体验也有差异。' }
            ],
            ratings: { difficulty: 1.5, fun: 4.2, replay: 4.8,上手: 5 },
            comments: []
        },
        '5': {
            id: '5',
            name: '宝石商人',
            nameEn: 'Gem Merchant',
            cover: '',
            minPlayers: 2,
            maxPlayers: 4,
            duration: 30,
            difficulty: 1,
            category: '入门',
            tags: ['收集', '成套', '策略'],
            description: '宝石商人是一款快速收集资源的德式桌游。玩家扮演宝石商人，通过购买宝石、获得发展卡来积累财富，率先获得指定分数的玩家获胜。',
            rules: '1. 每回合可以选择：拿取宝石、购买发展卡、储备宝石。2. 购买卡牌需要消耗对应颜色的宝石。3. 卡牌可以提供额外宝石或分数。',
            setupSteps: ['1. 将发展卡按等级排列', '2. 每人获得4个基础宝石', '3. 放置代币'],
            faq: [
                { q: '可以购买多张卡吗？', a: '每回合只能购买一张发展卡。' }
            ],
            ratings: { difficulty: 1.5, fun: 4.0, replay: 4.5,上手: 4.8 },
            comments: []
        },
        '6': {
            id: '6',
            name: '德国心脏病',
            nameEn: 'Halli Galli',
            cover: '',
            minPlayers: 3,
            maxPlayers: 6,
            duration: 20,
            difficulty: 1,
            category: '聚会',
            tags: ['反应', '欢乐', '家庭'],
            description: '德国心脏病是一款考验反应速度的欢乐游戏。当水果牌出现特定组合时，玩家需要快速抢按铃铛，反应最慢的玩家收走所有牌。',
            rules: '1. 玩家轮流翻开发牌区的牌。2. 当看到5个相同水果时，抢按铃铛。3. 按错的玩家给所有玩家各发一张牌。',
            setupSteps: ['1. 将所有牌洗匀', '2. 每人轮流发5张牌作为手牌', '3. 将剩余牌放在中央作为发牌区', '4. 将铃铛放在桌面中央'],
            faq: [
                { q: '牌不够分怎么办？', a: '如果翻牌时没有牌了，回合结束。' }
            ],
            ratings: { difficulty: 1, fun: 4.6, replay: 4.2,上手: 5 },
            comments: []
        },
        '7': {
            id: '7',
            name: '行动代号',
            nameEn: 'Codenames',
            cover: '',
            minPlayers: 4,
            maxPlayers: 8,
            duration: 15,
            difficulty: 1,
            category: '聚会',
            tags: ['配合', '词汇', '猜词'],
            description: '行动代号是一款双人对抗的猜词游戏。两队玩家各有一名队长给出线索，其他队员需要在25张词卡中猜出队友的词。',
            rules: '1. 队长给出数字和一个与目标词相关的词语。2. 队员可以猜测最多N+1个词。3. 猜中目标词得分，猜中刺客词直接失败。',
            setupSteps: ['1. 将25张词卡随机摆成5x5', '2. 将对应颜色的词语翻面', '3. 每队选出一名队长', '4. 队长查看词语对应表'],
            faq: [
                { q: '几个人玩比较好？', a: '4-8人最佳，需要两队各2人以上。' }
            ],
            ratings: { difficulty: 1.5, fun: 4.7, replay: 5,上手: 4.5 },
            comments: []
        },
        '8': {
            id: '8',
            name: '阿瓦隆',
            nameEn: 'The Resistance: Avalon',
            cover: '',
            minPlayers: 5,
            maxPlayers: 10,
            duration: 30,
            difficulty: 2,
            category: '推理',
            tags: ['推理', '隐藏身份', '团队'],
            description: '阿瓦隆是狼人杀的升级版，玩家分为抵抗军和莫甘娜阵营。梅林需要找出坏人，而莫甘娜则要隐藏身份带领好人执行失败任务。',
            rules: '1. 队长提出任务队伍人选。2. 所有玩家投票是否同意。3. 队伍成员秘密做任务，成功或失败。4. 3次失败任务好人输，3次成功好人赢。',
            setupSteps: ['1. 根据人数发身份牌', '2. 好人阵营互相确认', '3. 莫甘娜展示假梅林'],
            faq: [
                { q: '和狼人杀有什么区别？', a: '没有淘汰机制，所有人全程参与，信息更丰富。' }
            ],
            ratings: { difficulty: 2.5, fun: 4.9, replay: 5,上手: 3.5 },
            comments: []
        },
        '9': {
            id: '9',
            name: '璀璨宝石',
            nameEn: 'Splendor',
            cover: '',
            minPlayers: 2,
            maxPlayers: 4,
            duration: 30,
            difficulty: 1,
            category: '入门',
            tags: ['收集', '策略', '卡牌'],
            description: '璀璨宝石是一款精美的资源收集游戏。玩家扮演文艺复兴时期的宝石商人，通过收集宝石、购买开发卡来积累财富和声望。',
            rules: '1. 每回合可以选择：拿取宝石、购买卡牌、保留黄金。2. 购买卡牌需要对应颜色的宝石。3. 积累15分以上率先结束回合获胜。',
            setupSteps: ['1. 将4种卡牌按等级排列', '2. 放置宝石和黄金 token', '3. 每人获得10个筹码'],
            faq: [
                { q: '可以保留黄金token吗？', a: '每局游戏只能保留1个黄金，且只能保留到下回合使用。' }
            ],
            ratings: { difficulty: 1.5, fun: 4.1, replay: 4.6,上手: 4.8 },
            comments: []
        },
        '10': {
            id: '10',
            name: '七大奇迹',
            nameEn: '7 Wonders',
            cover: '',
            minPlayers: 3,
            maxPlayers: 7,
            duration: 30,
            difficulty: 2,
            category: '策略',
            tags: ['文明', '卡牌', '积分'],
            description: '七大奇迹是一款文明发展主题的卡牌游戏。玩家扮演古代文明的领袖，通过建设奇迹、发展科技和贸易来获取最高声望。',
            rules: '1. 每回合同时出牌，然后执行效果。2. 卡牌可以建造、使用或丢弃换钱。3. 三局后比较总分。',
            setupSteps: ['1. 每位玩家抽取一张奇迹板', '2. 洗匀年龄牌', '3. 每人发7张手牌'],
            faq: [
                { q: '最多几个人玩？', a: '标准规则最多7人，需要对应数量的奇迹板。' }
            ],
            ratings: { difficulty: 2.5, fun: 4.4, replay: 4.8,上手: 3.5 },
            comments: []
        }
    };

    // ==================== 状态管理 ====================
    var state = {
        gameId: '',
        game: null,
        isFavorite: false,
        descExpanded: false,
        isLoading: true,
        loadError: null,
        showQRModal: false,
        qrMode: 'rules'  // 'setup' | 'rules' | 'quick'
    };

    // ==================== 工具函数 ====================
    // 从 URL hash 解析游戏 ID
    function getGameIdFromHash() {
        console.log('[detail.js] 当前URL:', window.location.hash);
        var hash = window.location.hash || '';
        var match = hash.match(/[?&]id=([^&]+)/);
        var id = match ? decodeURIComponent(match[1]) : null;
        console.log('[detail.js] 解析到的游戏ID:', id, '类型:', typeof id);
        return id;
    }

    function getMockGameById(id) {
        return mockGames[id] || null;
    }

    // 从全局兜底数据中按 id 或 name 匹配游戏（Bug 1 修复：刷新后兜底）
    function getFallbackGame(idOrName) {
        var fallback = window._fallbackGames;
        if (!fallback || !fallback.length) return null;
        // 先精确匹配 id
        var found = fallback.find(function(g) { return g.id === idOrName; });
        if (found) return found;
        // 再按 name 模糊匹配（API 可能返回了游戏名但 id 不同）
        found = fallback.find(function(g) { return g.name === idOrName || g.name_en === idOrName; });
        if (found) return found;
        // 最后尝试 name 包含匹配（decode 后的中文名）
        var decoded = '';
        try { decoded = decodeURIComponent(idOrName); } catch(e) { decoded = idOrName; }
        found = fallback.find(function(g) { return g.name === decoded; });
        return found || null;
    }

    function formatDuration(minutes) {
        if (minutes >= 60) {
            var h = Math.floor(minutes / 60);
            var m = minutes % 60;
            return m > 0 ? h + '小时' + m + '分钟' : h + '小时';
        }
        return minutes + '分钟';
    }

    function getDifficultyText(level) {
        var map = { 1: '入门', 2: '简单', 3: '中等', 4: '困难', 5: '专家' };
        return map[level] || '入门';
    }

    function renderStars(rating) {
        var full = Math.floor(rating);
        var half = rating % 1 >= 0.5;
        var empty = 5 - full - (half ? 1 : 0);
        return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
    }

    function renderRatingBar(value) {
        var percent = (value / 5) * 100;
        return '<div class="detail-rating-bar">' +
            '<div class="detail-rating-fill" style="width:' + percent + '%"></div>' +
            '</div>';
    }

    // ==================== 渲染函数 ====================
    function renderHeader() {
        return '<div class="detail-header">' +
            '<span class="detail-back" onclick="detailPage.goBack()">← 返回</span>' +
            '<span class="detail-share" onclick="detailPage.share()">📤</span>' +
            '</div>';
    }

    function renderLoading() {
        return '<div class="detail-page">' +
            renderHeader() +
            '<div class="detail-loading" style="text-align:center;padding:50px;color:#8C8578;">加载中...</div>' +
            '</div>';
    }

    function renderError() {
        return '<div class="detail-page">' +
            renderHeader() +
            '<div class="detail-error" style="text-align:center;padding:50px;color:#e74c3c;">' +
            '<p>加载失败</p>' +
            '<p style="font-size:12px;color:#8C8578;">' + state.loadError + '</p>' +
            '<button onclick="detailPage.goBack()" style="margin-top:20px;padding:10px 20px;background:#C4864B;color:#fff;border:none;border-radius:5px;">返回首页</button>' +
            '</div>' +
            '</div>';
    }

    function renderCover() {
        return '<div class="detail-cover" style="background: linear-gradient(135deg, #C4864B, #7B9E87);">' +
            '<span class="detail-cover-text">🎲</span>' +
            '</div>';
    }

    function renderInfo() {
        var game = state.game;
        if (!game) return '<div class="detail-info card"><p>游戏数据不存在</p></div>';
        
        var desc = game.description || '';
        var shortDesc = desc.length > 60 ? desc.substring(0, 60) + '...' : desc;
        var displayDesc = state.descExpanded ? desc : shortDesc;
        var expandText = state.descExpanded ? '收起' : (desc.length > 60 ? '展开' : '');

        // 处理字段名兼容性
        var minPlayers = game.min_players || game.minPlayers || 0;
        var maxPlayers = game.max_players || game.maxPlayers || 0;
        var duration = game.duration || 30;
        var difficulty = game.difficulty || 2;
        var tags = game.tags || [];

        return '<div class="detail-info card">' +
            '<h1 class="detail-title">' + (game.name || '未知游戏') + '</h1>' +
            '<p class="detail-subtitle">' + (game.name_en || game.nameEn || '') + '</p>' +
            '<div class="detail-stats">' +
            '<div class="detail-stat"><span>👥</span><span>' + minPlayers + '-' + maxPlayers + '人</span></div>' +
            '<div class="detail-stat"><span>⏱️</span><span>' + formatDuration(duration) + '</span></div>' +
            '<div class="detail-stat"><span>📊</span><span>' + getDifficultyText(difficulty) + '</span></div>' +
            '</div>' +
            '<div class="detail-tags">' +
            tags.map(function(tag) {
                return '<span class="detail-tag">' + tag + '</span>';
            }).join('') +
            '</div>' +
            '<p class="detail-desc">' + displayDesc + '</p>' +
            (expandText ? '<span class="detail-expand" onclick="detailPage.toggleDesc()">' + expandText + '</span>' : '') +
            '</div>';
    }

    function renderAIButtons() {
        return '<div class="detail-ai-buttons">' +
            '<button class="detail-ai-btn" onclick="detailPage.goChat(\'setup\')">' +
            '<span>🎯</span><span>摆盘引导</span></button>' +
            '<button class="detail-ai-btn" onclick="detailPage.goChat(\'rules\')">' +
            '<span>📖</span><span>规则教学</span></button>' +
            '<button class="detail-ai-btn" onclick="detailPage.goChat(\'faq\')">' +
            '<span>🔍</span><span>规则速查</span></button>' +
            '</div>';
    }

    function renderRatings() {
        var game = state.game;
        if (!game || !game.ratings) return '';
        
        var ratings = game.ratings;
        var avgRating = ((ratings.difficulty || 0) + (ratings.fun || 0) + (ratings.replay || 0) + (ratings.上手 || 0)) / 4;
        avgRating = isNaN(avgRating) ? 0 : avgRating.toFixed(1);

        return '<div class="detail-ratings card">' +
            '<h3>玩家评分</h3>' +
            '<div class="detail-rating-item"><span>难度</span>' + renderRatingBar(ratings.difficulty || 0) + '<span>' + (ratings.difficulty || 0) + '</span></div>' +
            '<div class="detail-rating-item"><span>趣味</span>' + renderRatingBar(ratings.fun || 0) + '<span>' + (ratings.fun || 0) + '</span></div>' +
            '<div class="detail-rating-item"><span>重玩</span>' + renderRatingBar(ratings.replay || 0) + '<span>' + (ratings.replay || 0) + '</span></div>' +
            '<div class="detail-rating-item"><span>上手</span>' + renderRatingBar(ratings.上手 || 0) + '<span>' + (ratings.上手 || 0) + '</span></div>' +
            '<div class="detail-avg-rating"><span>综合</span><span class="detail-avg-num">' + avgRating + '</span></div>' +
            '</div>';
    }

    function renderComments() {
        var game = state.game;
        if (!game) return '';
        
        var comments = game.comments || [];
        var commentsHtml = '';

        if (comments.length === 0) {
            commentsHtml = '<p class="detail-no-comment">暂无评论，成为第一个评论者吧！</p>';
        } else {
            commentsHtml = comments.map(function(c) {
                return '<div class="detail-comment card">' +
                    '<div class="detail-comment-header">' +
                    '<div class="detail-comment-avatar">👤</div>' +
                    '<div class="detail-comment-meta">' +
                    '<span class="detail-comment-name">' + (c.user || '匿名') + '</span>' +
                    '<span class="detail-comment-stars">' + renderStars(c.rating || 0) + '</span>' +
                    '</div>' +
                    '</div>' +
                    '<div class="detail-comment-tags">' +
                    (c.tags || []).map(function(t) { return '<span class="detail-tag">' + t + '</span>'; }).join('') +
                    '</div>' +
                    '<p class="detail-comment-content">' + (c.content || '') + '</p>' +
                    '</div>';
            }).join('');
        }

        return '<div class="detail-comments">' +
            '<h3>精选评论</h3>' +
            commentsHtml +
            '<button class="detail-write-btn" onclick="detailPage.writeComment()">✏️ 写评论</button>' +
            '</div>';
    }

    function renderFavoriteBtn() {
        var icon = state.isFavorite ? '❤️' : '🤍';
        return '<div class="detail-favorite-btn" onclick="detailPage.toggleFavorite()">' + icon + '</div>';
    }

    // ==================== 二维码相关 ====================
    function renderQREntry() {
        return '<button class="detail-qr-entry" onclick="detailPage.showQRModal()">📱 生成分享二维码</button>';
    }

    function renderQRModal() {
        if (!state.showQRModal) return '';

        var game = state.game;
        var gameName = game ? (game.name || '未知游戏') : '未知游戏';
        var modes = [
            { id: 'setup', label: '摆盘引导' },
            { id: 'rules', label: '规则教学' },
            { id: 'quick', label: '规则速查' }
        ];

        var tabsHtml = modes.map(function(m) {
            return '<div class="qr-modal-tab' + (state.qrMode === m.id ? ' active' : '') +
                '" onclick="detailPage.switchQRMode(\'' + m.id + '\')">' + m.label + '</div>';
        }).join('');

        var modeNames = { setup: '摆盘引导', rules: '规则教学', quick: '规则速查' };
        var modeName = modeNames[state.qrMode] || '规则教学';

        // 微信/QQ中显示长按提示
        var isRestricted = QRUtils.isRestrictedBrowser();
        var saveTip = isRestricted ? '<div style="font-size:11px;color:#B5AFA6;margin:8px 0;text-align:center;">💡 微信中请<b>长按二维码</b>保存图片</div>' : '';
        var saveBtnText = '\u{1F4BE} 保存二维码图片';

        return '<div class="qr-modal-overlay" onclick="detailPage.closeQRModal(event)">' +
            '<div class="qr-modal" onclick="event.stopPropagation()">' +
            '<div class="qr-modal-title">生成分享二维码</div>' +
            '<div class="qr-modal-tabs">' + tabsHtml + '</div>' +
            '<div class="qr-modal-body">' +
            '<div class="qr-modal-canvas-wrap" id="detail-qr-canvas-wrap">' +
            '<div style="width:220px;height:293px;background:#F0EDE6;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#B5AFA6;font-size:14px;">加载中...</div>' +
            '</div>' +
            '<div id="detail-qr-img-wrap" style="display:none;margin-bottom:12px;text-align:center;"></div>' +
            saveTip +
            '<div class="qr-modal-desc">扫码学习 · ' + gameName + ' · ' + modeName + '</div>' +
            '<button class="qr-modal-btn" onclick="detailPage.downloadDetailQR()">' + saveBtnText + '</button>' +
            '</div>' +
            '<button class="qr-modal-close" onclick="detailPage.closeQRModal()">关闭</button>' +
            '</div>' +
            '</div>';
    }

    function loadDetailQR() {
        var wrap = document.getElementById('detail-qr-canvas-wrap');
        if (!wrap || !state.game) return;

        var game = state.game;
        var scale = 220 / QRUtils.CARD_W;
        var displayH = Math.round(QRUtils.CARD_H * scale);

        // 显示加载状态
        wrap.innerHTML = '<div style="width:220px;height:' + displayH + 'px;background:#F0EDE6;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#B5AFA6;font-size:14px;">生成中...</div>';

        // 检查QRCode库是否可用
        if (!QRUtils.isQRCodeAvailable()) {
            // 库不可用，直接用在线API兜底
            loadDetailQRFallback(game);
            return;
        }

        QRUtils.generateGameQRCard(state.gameId, game.name || '未知游戏', state.qrMode).then(function(canvas) {
            var isRestricted = QRUtils.isRestrictedBrowser();
            if (isRestricted) {
                // 微信/QQ：隐藏canvas，只展示img（支持长按保存）
                canvas.style.display = 'none';
                wrap.innerHTML = '';
                wrap.appendChild(canvas);
                showQRFallbackImg(canvas);
            } else {
                // 普通浏览器：展示canvas
                canvas.style.width = '220px';
                canvas.style.height = displayH + 'px';
                wrap.innerHTML = '';
                wrap.appendChild(canvas);
            }
        }).catch(function(e) {
            console.error('生成详情二维码失败:', e);
            loadDetailQRFallback(game);
        });
    }

    /** 二维码库不可用或用在线API兜底 */
    function loadDetailQRFallback(game) {
        var wrap = document.getElementById('detail-qr-canvas-wrap');
        if (!wrap) return;
        var gameName = game ? (game.name || '未知游戏') : '未知游戏';

        var url = QRUtils.getGameUrl(state.gameId, state.qrMode);
        var onlineUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=2D2A26&bgcolor=FFFFFF&data=' +
            encodeURIComponent(url);

        var imgHtml = '<img src="' + onlineUrl + '" style="width:220px;height:220px;border-radius:12px;display:block;">';

        if (QRUtils.isRestrictedBrowser()) {
            // 微信/QQ：隐藏wrap内容，只在img-wrap展示（可长按保存）
            wrap.innerHTML = '';
            var imgWrap = document.getElementById('detail-qr-img-wrap');
            if (imgWrap) {
                imgWrap.style.display = 'block';
                imgWrap.innerHTML = imgHtml +
                    '<div style="font-size:11px;color:#B5AFA6;margin-top:6px;">👆 长按二维码保存</div>';
            }
        } else {
            // 普通浏览器：直接在wrap中展示
            wrap.innerHTML = imgHtml;
        }
    }

    /** 在微信中额外展示img标签供长按保存 */
    function showQRFallbackImg(canvas) {
        var imgWrap = document.getElementById('detail-qr-img-wrap');
        if (!imgWrap) return;
        try {
            var dataUrl = canvas.toDataURL('image/png');
            imgWrap.style.display = 'block';
            imgWrap.innerHTML = '<img src="' + dataUrl +
                '" style="width:220px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);" />' +
                '<div style="font-size:11px;color:#B5AFA6;margin-top:6px;">👆 长按上方二维码保存</div>';
        } catch (e) {
            console.error('生成img失败:', e);
        }
    }

    function showQRModal() {
        state.showQRModal = true;
        state.qrMode = 'rules';
        window.detailPageRender();
        setTimeout(function() { loadDetailQR(); }, 200);
    }

    function closeQRModal(event) {
        if (event && event.target !== event.currentTarget) return;
        state.showQRModal = false;
        window.detailPageRender();
    }

    function switchQRMode(mode) {
        state.qrMode = mode;
        window.detailPageRender();
        setTimeout(function() { loadDetailQR(); }, 200);
    }

    async function downloadDetailQR() {
        var game = state.game;
        if (!game) return;
        try {
            var canvas = await QRUtils.generateGameQRCard(state.gameId, game.name || '未知游戏', state.qrMode);
            QRUtils.saveQRImage(canvas, (game.name || '游戏') + '-二维码.png');
        } catch (e) {
            console.error('下载失败:', e);
            alert('保存失败: ' + (e.message || '请尝试截图保存'));
        }
    }

    function render(params) {
        // 加载中状态
        if (state.isLoading) {
            return renderLoading();
        }
        // 错误状态
        if (state.loadError) {
            return renderError();
        }
        // 如果外部传入了 gameId，优先使用
        if (params && params.id && !state.gameId) {
            state.gameId = params.id;
        }
        return '<div class="detail-page">' +
            renderHeader() +
            renderCover() +
            '<div class="detail-content">' +
            renderInfo() +
            renderQREntry() +
            renderAIButtons() +
            renderRatings() +
            renderComments() +
            '</div>' +
            renderFavoriteBtn() +
            renderQRModal() +
            '</div>';
    }

    // ==================== 事件处理 ====================
    function init(params) {
        console.log('[detail.js] init 被调用');
        // 优先使用 params 中的 id，其次从 URL hash 解析
        if (params && params.id) {
            state.gameId = params.id;
        } else {
            state.gameId = getGameIdFromHash();
        }
        
        if (!state.gameId) {
            console.error('[detail.js] 无法获取游戏ID!');
            state.loadError = '无法获取游戏ID';
            state.isLoading = false;
            window.detailPageRender();
            return;
        }
        
        // 显示加载状态
        state.isLoading = true;
        state.loadError = null;
        window.detailPageRender();
        
        // 从 Supabase 加载游戏数据
        loadGameFromDB(state.gameId);
    }

    // 从数据库加载游戏详情
    async function loadGameFromDB(id) {
        console.log('[detail.js] 准备从数据库加载游戏, ID:', id);
        
        try {
            if (typeof window.getGameDetail !== 'function') {
                throw new Error('API 未加载');
            }
            
            console.log('[detail.js] 调用 window.getGameDetail()');
            var game = await window.getGameDetail(id);
            console.log('[detail.js] getGameDetail 返回:', game ? game.name : 'null');
            
            if (!game) {
                // 尝试全局桌游接口
                if (typeof window.getGlobalGame === 'function') {
                    console.log('[detail.js] 尝试全局桌游接口');
                    game = await window.getGlobalGame(id);
                    console.log('[detail.js] getGlobalGame 返回:', game ? game.name : 'null');
                }
            }
            
            if (!game) {
                // 尝试从 mockGames 回退（仅匹配数字ID）
                console.warn('[detail.js] API未找到，尝试mockGames');
                game = getMockGameById(id);
                if (game) {
                    console.log('[detail.js] mockGames命中:', game.name);
                }
            }
            
            if (!game) {
                // Bug 1 修复：从内置25款兜底数据中匹配（按 id 或 name）
                console.warn('[detail.js] 尝试内置兜底数据，ID:', id);
                game = getFallbackGame(id);
                if (game) {
                    console.log('[detail.js] 兜底数据命中:', game.name);
                }
            }
            
            if (game) {
                state.game = game;
                state.isLoading = false;
                state.loadError = null;
                console.log('[detail.js] 加载成功:', game.name);
            } else {
                state.game = null;
                state.isLoading = false;
                state.loadError = '游戏不存在 (ID: ' + id + ')';
                console.error('[detail.js] 游戏不存在');
            }
        } catch (error) {
            console.error('[detail.js] 加载失败:', error);
            // 逐级回退
            var mockGame = getMockGameById(id);
            if (!mockGame) mockGame = getFallbackGame(id);
            if (mockGame) {
                console.log('[detail.js] 使用兜底数据:', mockGame.name);
                state.game = mockGame;
                state.isLoading = false;
                state.loadError = null;
            } else {
                state.game = null;
                state.isLoading = false;
                state.loadError = error.message || '加载失败';
            }
        }
        
        window.detailPageRender();
    }

    function goBack() {
        // Bug 4 修复：回到上一页，而非总是跳转首页
        var prevPage = sessionStorage.getItem('prevPageBeforeDetail');
        if (prevPage) {
            sessionStorage.removeItem('prevPageBeforeDetail');
            window.location.hash = prevPage;
        } else {
            // 兜底：优先用浏览器历史
            try {
                if (window.history.length > 1) {
                    window.history.back();
                    return;
                }
            } catch(e) {}
            window.location.hash = '/home';
        }
    }

    function share() {
        showQRModal();
    }

    function toggleDesc() {
        state.descExpanded = !state.descExpanded;
        window.detailPageRender();
    }

    function goChat(mode) {
        sessionStorage.setItem('chatFrom', '/detail?id=' + state.gameId);
        window.location.hash = '/chat?gameId=' + state.gameId + '&mode=' + mode;
    }

    function toggleFavorite() {
        state.isFavorite = !state.isFavorite;
        window.detailPageRender();
    }

    function writeComment() {
        alert('评论功能即将上线！');
    }

    // 导出页面对象
    var page = {
        render: render,
        init: init,
        goBack: goBack,
        share: share,
        toggleDesc: toggleDesc,
        goChat: goChat,
        toggleFavorite: toggleFavorite,
        writeComment: writeComment,
        showQRModal: showQRModal,
        closeQRModal: closeQRModal,
        switchQRMode: switchQRMode,
        downloadDetailQR: downloadDetailQR
    };

    // 全局暴露
    window.detailPage = page;
    window.detailPageRender = function() {
        var app = document.getElementById('app');
        if (app) {
            app.innerHTML = (window.renderShopHeader ? window.renderShopHeader() : '') + page.render();
            window.bindTabBarEvents();
            // 注意：不在这里调用 init()，避免无限递归
        }
    };

    return page;
})());
