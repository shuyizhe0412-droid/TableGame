/**
 * 桌游AI教练 - API 封装模块
 * 对接 boardgame-hub.onrender.com 后端
 * 包含店家认证、桌游管理、文件上传、玩家端公开接口、AI对话
 */
console.log('[api.js] 开始加载...');

// ==================== Token 管理 ====================
function getToken() {
    return localStorage.getItem('auth_token');
}

function setToken(token) {
    localStorage.setItem('auth_token', token);
}

function clearToken() {
    localStorage.removeItem('auth_token');
}

function isLoggedIn() {
    return !!getToken();
}

// 构建带 Bearer Token 的请求头
function getAuthHeaders() {
    var token = getToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

// ==================== 通用 fetch 封装 ====================
async function apiFetch(url, options) {
    options = options || {};
    var headers = options.headers || {};
    // 如果有 token 自动带上
    if (!headers['Authorization']) {
        var token = getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
    }
    if (!headers['Content-Type'] && options.method && options.method !== 'GET') {
        headers['Content-Type'] = 'application/json';
    }
    options.headers = headers;

    var resp = await fetch(url, options);
    var data = null;
    try { data = await resp.json(); } catch (e) { data = null; }

    if (!resp.ok) {
        var msg = (data && data.error) || (data && data.message) || ('HTTP ' + resp.status);
        throw new Error(msg);
    }
    return data;
}

// ==================== 字段名归一化 ====================
// API 返回 game_name/player_min/player_max/duration/tags(字符串)/cover_url
// 前端期望 name/min_players/max_players/play_time/tags(数组)/cover

function normalizeSingleGame(game) {
    if (!game) return game;
    // game_name → name
    if (game.game_name !== undefined && game.name === undefined) {
        game.name = game.game_name;
    }
    // player_min → min_players, minPlayers
    if (game.player_min !== undefined) {
        if (game.min_players === undefined) game.min_players = game.player_min;
        if (game.minPlayers === undefined) game.minPlayers = game.player_min;
    }
    // player_max → max_players, maxPlayers
    if (game.player_max !== undefined) {
        if (game.max_players === undefined) game.max_players = game.player_max;
        if (game.maxPlayers === undefined) game.maxPlayers = game.player_max;
    }
    // duration → play_time
    if (game.duration !== undefined && game.play_time === undefined) {
        game.play_time = game.duration;
    }
    // cover_url → cover
    if (game.cover_url !== undefined && game.cover === undefined) {
        game.cover = game.cover_url;
    }
    // tags: comma-separated string → array
    if (typeof game.tags === 'string') {
        game.tags = game.tags.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t; });
    }
    return game;
}

function normalizeGameData(data) {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(normalizeSingleGame);
    }
    return normalizeSingleGame(data);
}

// ==================== 店家认证 API ====================

/**
 * 注册店家账号
 * @param {string} email
 * @param {string} password
 * @param {string} storeName - 店名
 */
async function authRegister(email, password, storeName) {
    console.log('[authRegister] 注册:', email, storeName);
    var data = await apiFetch(API_BASE_URL + '/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: email, password: password, store_name: storeName })
    });
    if (data && data.token) {
        setToken(data.token);
    }
    return data;
}

/**
 * 店家登录
 * @param {string} email
 * @param {string} password
 */
async function authLogin(email, password) {
    console.log('[authLogin] 登录:', email);
    var data = await apiFetch(API_BASE_URL + '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email, password: password })
    });
    if (data && data.token) {
        setToken(data.token);
    }
    return data;
}

/**
 * 获取当前登录店家信息
 */
async function authGetMe() {
    console.log('[authGetMe] 查询当前用户');
    return await apiFetch(API_BASE_URL + '/auth/me', { method: 'GET' });
}

/**
 * 更新当前登录店家的店铺名称
 * @param {object} data - { store_name: "新名称" }
 */
async function updateStoreProfile(data) {
    console.log('[updateStoreProfile] 更新店铺信息:', data);
    var result = await apiFetch(API_BASE_URL + '/auth/update-profile', {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    return result;
}

/**
 * 登出
 */
function authLogout() {
    clearToken();
    window._shopInfo = null;
    sessionStorage.removeItem('shopId');
}

// ==================== 桌游管理 API（需要认证） ====================

/**
 * 获取我的桌游列表（店家后台）
 * 后端返回格式: { games: [...] } 或直接返回数组
 */
async function getMyGames() {
    console.log('[getMyGames] 获取我的桌游列表');
    var data = await apiFetch(API_BASE_URL + '/games', { method: 'GET' });
    // 解包：后端可能返回 { games: [...] } 或直接是数组
    var games = (data && data.games) ? data.games : data;
    return normalizeGameData(games);
}

/**
 * 获取我的桌游详情（店家后台）
 * 后端返回格式: { game: { name: "卡坦岛", ... }, files: [] }
 * @param {string} id
 */
async function getMyGameDetail(id) {
    console.log('[getMyGameDetail] ID:', id);
    var data = await apiFetch(API_BASE_URL + '/games/' + encodeURIComponent(id), { method: 'GET' });
    // 解包：后端返回 { game: {...}, files: [] }，取 game 字段
    var game = (data && data.game) ? data.game : data;
    console.log('[getMyGameDetail] 解包后 game.name:', game ? game.name : 'null');
    return normalizeSingleGame(game);
}

/**
 * 添加桌游
 * @param {object} data - { game_name, player_min, player_max, duration, difficulty, tags }
 */
async function createGame(data) {
    console.log('[createGame] 添加:', data.game_name);
    return await apiFetch(API_BASE_URL + '/games', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * 编辑桌游
 * @param {string} id
 * @param {object} data
 */
async function updateGame(id, data) {
    console.log('[updateGame] ID:', id);
    return await apiFetch(API_BASE_URL + '/games/' + encodeURIComponent(id), {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * 删除桌游
 * @param {string} id
 */
async function deleteGame(id) {
    console.log('[deleteGame] ID:', id);
    return await apiFetch(API_BASE_URL + '/games/' + encodeURIComponent(id), {
        method: 'DELETE'
    });
}

/**
 * 获取桌游规则摘要
 * 优先尝试认证接口（带 auth），失败则尝试公开接口
 * @param {string} id - 游戏ID
 * @returns {Promise<string>} 规则文本
 */
async function getGameRules(id) {
    console.log('[getGameRules] ID:', id);

    // 优先尝试认证接口 GET /api/games/:id/rules
    try {
        var data = await apiFetch(API_BASE_URL + '/games/' + encodeURIComponent(id) + '/rules', { method: 'GET' });
        var text = (data && typeof data.rules_text === 'string') ? data.rules_text :
                   (typeof data === 'string') ? data :
                   (data && data.rules_text) ? data.rules_text : '';
        if (text) {
            console.log('[getGameRules] 认证接口命中，长度:', text.length);
            return text;
        }
        console.log('[getGameRules] 认证接口返回空，尝试公开接口');
    } catch (e) {
        console.warn('[getGameRules] 认证接口失败:', e.message, '，尝试公开接口');
    }

    // 兜底：尝试公开接口 GET /api/public/game/:id（可能返回的游戏中包含 rules 字段）
    try {
        var publicData = await publicApiFetch(API_BASE_URL + '/public/game/' + encodeURIComponent(id));
        var publicRules = (publicData && publicData.rules_text) ? publicData.rules_text :
                          (publicData && publicData.rules) ? publicData.rules : '';
        if (publicRules) {
            console.log('[getGameRules] 公开接口命中，长度:', publicRules.length);
            return publicRules;
        }
        console.log('[getGameRules] 公开接口也未返回规则');
    } catch (e2) {
        console.warn('[getGameRules] 公开接口也失败:', e2.message);
    }

    return '';
}

/**
 * 保存桌游规则摘要（需要认证，最多5000字）
 * @param {string} id
 * @param {string} rulesContent
 */
async function saveGameRules(id, rulesContent) {
    console.log('[saveGameRules] ID:', id, '长度:', rulesContent.length);
    if (rulesContent.length > 5000) {
        throw new Error('规则内容超过5000字限制');
    }
    return await apiFetch(API_BASE_URL + '/games/' + encodeURIComponent(id) + '/rules', {
        method: 'PUT',
        body: JSON.stringify({ rules_text: rulesContent })
    });
}

// ==================== 文件上传 API（需要认证） ====================

/**
 * 上传封面图
 * @param {File} file - 图片文件
 * @param {string} gameId - 游戏ID
 */
async function uploadCover(file, gameId) {
    console.log('[uploadCover] gameId:', gameId);
    var formData = new FormData();
    formData.append('file', file);
    formData.append('game_id', gameId);

    var token = getToken();
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    // 不设 Content-Type，浏览器自动设 multipart/form-data

    var resp = await fetch(API_BASE_URL + '/upload/cover', {
        method: 'POST',
        headers: headers,
        body: formData
    });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || data.message || '上传失败');
    return data;
}

/**
 * 上传规则书
 * @param {File} file - PDF/文档文件
 * @param {string} gameId - 游戏ID
 */
async function uploadRules(file, gameId) {
    console.log('[uploadRules] gameId:', gameId);
    var formData = new FormData();
    formData.append('file', file);
    formData.append('game_id', gameId);

    var token = getToken();
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var resp = await fetch(API_BASE_URL + '/upload', {
        method: 'POST',
        headers: headers,
        body: formData
    });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || data.message || '上传失败');
    return data;
}

/**
 * 获取某桌游的文件列表（需要认证）
 * @param {string} gameId
 */
async function getUploads(gameId) {
    console.log('[getUploads] gameId:', gameId);
    return await apiFetch(API_BASE_URL + '/upload/' + encodeURIComponent(gameId), { method: 'GET' });
}

// ==================== 玩家端公开 API（不需要认证） ====================

/**
 * 获取全部默认桌游列表（不需要认证）
 */
async function getGlobalGames() {
    console.log('[getGlobalGames] 获取全局默认桌游');
    var data = await apiFetch(API_BASE_URL + '/admin/global-games', { method: 'GET' });
    return normalizeGameData(data);
}

/**
 * 获取单个默认桌游详情（不需要认证）
 * @param {string} id - 游戏ID
 */
async function getGlobalGame(id) {
    console.log('[getGlobalGame] ID:', id);
    var data = await apiFetch(API_BASE_URL + '/admin/global-games/' + encodeURIComponent(id), { method: 'GET' });
    return normalizeGameData(data);
}

// ==================== 公开接口专用 fetch（不带认证） ====================

/**
 * 公开接口请求封装（不发送 Authorization header）
 * 用于 /api/public/* 路径，未登录顾客也能访问
 */
async function publicApiFetch(url) {
    var resp = await fetch(url);
    var data = null;
    try { data = await resp.json(); } catch (e) { data = null; }
    if (!resp.ok) {
        var msg = (data && data.error) || (data && data.message) || ('HTTP ' + resp.status);
        throw new Error(msg);
    }
    return data;
}

/**
 * 获取某店家的桌游列表（玩家端，不需要认证）
 * GET /api/public/games/:storeId
 * @param {string} storeId - 店家ID
 */
async function getPublicGames(storeId) {
    console.log('[getPublicGames] storeId:', storeId);
    var url = API_BASE_URL + '/public/games/' + encodeURIComponent(storeId);
    var data = await publicApiFetch(url);
    return normalizeGameData(data);
}

/**
 * 获取某桌游详情（玩家端，不需要认证）
 * GET /api/public/game/:id
 * @param {string} id - 游戏ID
 */
async function getPublicGame(id) {
    console.log('[getPublicGame] ID:', id);
    var url = API_BASE_URL + '/public/game/' + encodeURIComponent(id);
    var data = await publicApiFetch(url);
    return normalizeGameData(data);
}

// ==================== 兼容旧API的统一入口 ====================

/**
 * 获取游戏列表（统一入口）
 *
 * 优先级：
 *   店家已登录 → GET /api/games + GET /api/admin/global-games（合并去重）
 *   未登录 + shopId → GET /api/public/games/:shopId（优先，不带auth）
 *                     + GET /api/admin/global-games（合并补充）
 *                     → GET /api/admin/global-games（公开失败兜底）
 *   未登录 + 无shopId → GET /api/admin/global-games
 *
 * @param {object} filters - 筛选条件（暂未在后端实现，前端自行过滤）
 * @param {string} [storeId] - 店家ID（玩家端使用）
 */
async function getGames(filters, storeId) {
    console.log('[getGames] 开始, storeId:', storeId, ', loggedIn:', isLoggedIn());

    // Bug 3 修复：店家已登录时，合并店家自己的桌游 + 全局默认桌游（去重）
    if (isLoggedIn()) {
        console.log('[getGames] 店家模式，合并我的桌游和全局桌游');
        var myGames = [];
        var globalGames = [];
        try {
            myGames = await getMyGames();
            myGames = myGames || [];
        } catch (e) {
            console.warn('[getGames] getMyGames 失败:', e.message);
        }
        try {
            globalGames = await getGlobalGames();
            globalGames = globalGames || [];
        } catch (e) {
            console.warn('[getGames] getGlobalGames 失败:', e.message);
        }
        // 合并去重：按 name 去重，优先保留 myGames 中的数据
        var mergedMap = {};
        if (globalGames.length > 0) {
            globalGames.forEach(function(g) {
                if (g.name) mergedMap[g.name] = g;
            });
        }
        if (myGames.length > 0) {
            myGames.forEach(function(g) {
                if (g.name) mergedMap[g.name] = g;  // 店家自己的覆盖全局
            });
        }
        var merged = [];
        var keys = Object.keys(mergedMap);
        for (var i = 0; i < keys.length; i++) {
            merged.push(mergedMap[keys[i]]);
        }
        console.log('[getGames] 合并后桌游数量:', merged.length, '(我的:' + myGames.length + ', 全局:' + globalGames.length + ')');
        return merged;
    }

    // 未登录顾客端：优先用传入的 storeId，其次从 session 取
    if (!storeId) {
        storeId = sessionStorage.getItem('shopId');
    }

    // 有 storeId → 优先调用店家公开 API GET /api/public/games/:shopId
    if (storeId) {
        try {
            var publicGames = await getPublicGames(storeId);
            publicGames = publicGames || [];
            console.log('[getGames] 公开API命中, shopId:', storeId, ', 数量:', publicGames.length);
            
            // 合并全局桌游作为补充（店家桌游优先，全局补充没有收录的游戏）
            try {
                var supplementGlobal = await getGlobalGames();
                supplementGlobal = supplementGlobal || [];
                if (supplementGlobal.length > 0) {
                    var pubMergeMap = {};
                    supplementGlobal.forEach(function(g) { if (g.name) pubMergeMap[g.name] = g; });
                    publicGames.forEach(function(g) { if (g.name) pubMergeMap[g.name] = g; });
                    var pubMerged = [];
                    var pubKeys = Object.keys(pubMergeMap);
                    for (var j = 0; j < pubKeys.length; j++) pubMerged.push(pubMergeMap[pubKeys[j]]);
                    console.log('[getGames] 合并公开+全局, 店家:' + publicGames.length + ', 全局:' + supplementGlobal.length + ', 合计:' + pubMerged.length);
                    return pubMerged;
                }
            } catch (eSupp) {
                console.warn('[getGames] 全局补充获取失败，仅返回店家桌游:', eSupp.message);
            }
            return publicGames;
        } catch (e) {
            console.error('[getGames] 公开API获取失败，降级到全局桌游:', e.message);
            // 降级兜底：使用全局默认桌游
            try {
                var fallbackGlobal = await getGlobalGames();
                console.log('[getGames] 降级全局桌游数量:', (fallbackGlobal || []).length);
                return fallbackGlobal || [];
            } catch (e2) {
                console.error('[getGames] 全局桌游获取也失败:', e2.message);
                return [];
            }
        }
    }

    // 无 storeId 且未登录 → 调用全局默认桌游 API
    console.log('[getGames] 未登录且无 storeId，调用全局默认桌游');
    try {
        var globalGamesOnly = await getGlobalGames();
        return globalGamesOnly || [];
    } catch (e) {
        console.error('[getGames] 全局桌游获取失败:', e);
        return [];
    }
}

/**
 * 验证游戏对象是否有效（至少包含 name 或 game_name）
 * 防止 API 返回 {} 空对象被当作有效结果
 */
function isValidGameObject(g) {
    return g && typeof g === 'object' && (g.name || g.game_name);
}

/**
 * 获取游戏详情（统一入口）
 *
 * 优先级：
 *   店家已登录 → GET /api/games/:id（管理端）→ GET /api/public/game/:id（公开）→ GET /api/admin/global-games/:id（兜底）
 *   未登录     → GET /api/public/game/:id（优先）→ GET /api/admin/global-games/:id（兜底）
 *
 * @param {string} id - 游戏ID
 */
async function getGameDetail(id) {
    console.log('[getGameDetail] ID:', id);

    // 店家已登录：尝试管理端
    if (isLoggedIn()) {
        try {
            var myGame = await getMyGameDetail(id);
            if (isValidGameObject(myGame)) {
                console.log('[getGameDetail] 管理端命中:', myGame.name);
                return myGame;
            }
            console.warn('[getGameDetail] 管理端返回无效对象（无name），继续fallback');
        } catch (e) {
            console.warn('[getGameDetail] 管理端获取失败，尝试公开接口:', e.message);
        }
    } else {
        console.log('[getGameDetail] 未登录，跳过管理端');
    }

    // 公开接口
    try {
        var publicGame = await getPublicGame(id);
        if (isValidGameObject(publicGame)) {
            console.log('[getGameDetail] 公开接口命中:', publicGame.name);
            return publicGame;
        }
        console.warn('[getGameDetail] 公开接口返回无效对象（无name），继续fallback');
    } catch (e) {
        console.warn('[getGameDetail] 公开接口获取失败，尝试全局桌游:', e.message);
    }

    // 全局默认桌游接口兜底
    try {
        var globalGame = await getGlobalGame(id);
        if (isValidGameObject(globalGame)) {
            console.log('[getGameDetail] 全局桌游命中:', globalGame.name);
            return globalGame;
        }
        console.warn('[getGameDetail] 全局桌游返回无效对象（无name）');
    } catch (e) {
        console.warn('[getGameDetail] 全局桌游接口获取失败:', e.message);
    }

    // 所有接口都未返回有效数据
    console.error('[getGameDetail] 所有接口均未返回有效数据，ID:', id);
    return null;
}

/**
 * 获取店家信息
 * @param {string} shopId - 店家UUID
 */
async function getShopInfo(shopId) {
    console.log('[getShopInfo] shopId:', shopId);

    // 已登录且shopId匹配当前用户
    if (isLoggedIn()) {
        try {
            var me = await authGetMe();
            if (me && (me.id === shopId || me.store_id === shopId)) {
                console.log('[getShopInfo] 从认证信息获取:', me.store_name || me.name);
                return {
                    data: {
                        id: me.id || me.store_id || shopId,
                        name: me.store_name || me.name || '我的桌游吧',
                        logo_url: me.logo_url || '',
                        theme_color: me.theme_color || '#C4864B'
                    },
                    error: null
                };
            }
        } catch (e) {
            console.warn('[getShopInfo] authGetMe 失败:', e.message);
        }
    }

    // 公开模式：优先尝试公开店铺信息接口 GET /api/public/shop/:id
    // 注意：API 返回字段为 store_name/logo_url，不是 name/logo
    try {
        var shopData = await publicApiFetch(API_BASE_URL + '/public/shop/' + encodeURIComponent(shopId));
        console.log('[getShopInfo] 公开接口返回:', JSON.stringify(shopData));
        // 兼容两种字段名：store_name（公开接口实际返回）和 name（预备）
        if (shopData && (shopData.store_name || shopData.name)) {
            var shopName = shopData.store_name || shopData.name || '桌游吧';
            console.log('[getShopInfo] 公开接口命中:', shopName);
            return {
                data: {
                    id: shopData.id || shopId,
                    name: shopName,
                    logo_url: shopData.logo_url || shopData.avatar || '',
                    theme_color: shopData.theme_color || '#C4864B'
                },
                error: null
            };
        }
    } catch (e) {
        console.warn('[getShopInfo] 公开店铺接口失败:', e.message);
    }

    // 兜底 1：尝试从游戏列表推断店名
    try {
        var games = await getPublicGames(shopId);
        if (games && games.length > 0) {
            var storeName = games[0].store_name || '桌游吧';
            return {
                data: {
                    id: shopId,
                    name: storeName,
                    logo_url: '',
                    theme_color: '#C4864B'
                },
                error: null
            };
        }
    } catch (e) {
        console.warn('[getShopInfo] 获取游戏列表失败:', e.message);
    }

    // 兜底 2：返回基本信息
    return {
        data: {
            id: shopId,
            name: '桌游吧',
            logo_url: '',
            theme_color: '#C4864B'
        },
        error: null
    };
}

// ==================== AI 问答 API ====================

/**
 * 向 AI 提问（玩家端）
 * @param {string} gameId - 桌游 ID
 * @param {string} question - 用户问题
 * @returns {Promise<string>} AI 回答文本
 */
async function askAI(gameId, question) {
    console.log('[askAI] gameId:', gameId, 'question:', question);
    var data = await apiFetch(API_BASE_URL + '/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, question: question })
    });
    // 兼容多种返回格式: { answer: "..." } / { reply: "..." } / "..." 直接字符串
    if (data && typeof data.answer === 'string') return data.answer;
    if (data && typeof data.reply === 'string') return data.reply;
    if (typeof data === 'string') return data;
    // 兜底：把整个 data 对象转为 JSON 字符串（调试用）
    return JSON.stringify(data);
}

// ==================== AI 对话（保持使用 Supabase 代理） ====================

function buildShopContext() {
    var shopInfo = window._shopInfo;
    if (!shopInfo || !shopInfo.name) return '';
    return '\n【店家上下文】你正在"' + shopInfo.name + '"桌游吧为顾客服务。请保持专业友好的服务态度。';
}

async function aiChat(messages, gameName, mode, style, gameData) {
    var SUPABASE_FUNCTION_URL = SUPABASE_URL + '/functions/v1/deepseek-proxy';
    var shopContext = buildShopContext();

    // ==================== 防幻觉前缀 ====================
    var antiHallucinationPrefix = '' +
        '你是一个桌游规则教学AI。请严格遵守以下规则：\n' +
        '\n' +
        '1. 你只能讲解当前正在学习的这款游戏的规则，绝对不能引用任何其他桌游。\n' +
        '\n' +
        '2. 你的回答必须100%基于下方提供的游戏规则文本。规则文本中没有的内容，你绝对不能编造。\n' +
        '\n' +
        '3. 如果规则文本中没有提到某个机制或细节，你必须回答：\n' +
        '   "这部分规则在数据库中没有记录，建议查阅官方规则书确认。"\n' +
        '\n' +
        '4. 宁可少说，也不能说错。不确定的内容必须标注[需确认]。\n' +
        '\n' +
        '5. 回答格式：先用一句话概括，再分点详细讲解。\n';

    var gameDataSection = '';
    if (gameData) {
        gameDataSection = '\n---\n' +
            '游戏名称：' + (gameData.name || gameName || '') + '\n' +
            '完整规则：' + (gameData.rules || '无') + '\n' +
            '常见问题：' + (gameData.faq || '无') + '\n' +
            '摆盘步骤：' + (gameData.setup_steps || '无') + '\n';
    }

    var systemPrompts = {
        teacher: '你是一位专业的桌游教练"正经老师"。你正在教用户玩《' + (gameName || '桌游') + '》。\n' +
            '当前模式：' + (mode === 'setup' ? '摆盘引导' : mode === 'rules' ? '规则教学' : mode === 'faq' ? '规则速查' : mode === 'recommend' ? 'AI推荐' : '规则速查') + '。\n' +
            '回答规则：\n' +
            '1. 规则模糊的问题 → 给出合理建议，说明"规则书未明确规定"\n' +
            '2. 策略问题 → 可以回答，标注"⚠️ 策略建议，非规则"\n' +
            '3. 边角情况 → 尽量回答，附"📖 请参考规则书确认"\n' +
            '4. 超范围问题 → 简要回答，推荐跳转对应桌游\n' +
            '用简洁清晰的中文回答，适当分段。' + shopContext,
        friend: '你是一位热情友好的桌游爱好者"热情朋友"！你正在教用户玩《' + (gameName || '桌游') + '》。\n' +
            '语气轻松活泼，多用emoji，像朋友一样聊天。当前模式：' + (mode === 'setup' ? '摆盘引导' : mode === 'rules' ? '规则教学' : mode === 'faq' ? '规则速查' : mode === 'recommend' ? 'AI推荐' : '规则速查') + '。\n' +
            '回答规则同上，但语气更随意有趣。' + shopContext,
        dict: '你是《' + (gameName || '桌游') + '》规则词典。只输出精炼的事实性答案，不废话。\n' +
            '格式：直接给结论 → 简要解释。当前模式：' + (mode === 'setup' ? '摆盘引导' : mode === 'rules' ? '规则教学' : mode === 'faq' ? '规则速查' : mode === 'recommend' ? 'AI推荐' : '规则速查') + '。' + shopContext,
        _recommend: '你是一个桌游推荐助手。根据用户的人数、时长、类型偏好等条件，从已知的桌游数据库中推荐最合适的游戏。\n' +
            '引导流程：\n' +
            '1. 先问清楚用户：多少人玩？想玩多久？喜欢什么类型（策略/聚会/推理/卡牌等）？\n' +
            '2. 根据回答推荐 2-3 款桌游，每款简要说明推荐理由、人数、时长、难度\n' +
            '3. 回答风格：热情友好，用emoji增添趣味\n' +
            '如果用户已经说了具体需求，直接推荐，不用再反问。' + shopContext,
        _quick: '你是一个桌游规则速查助手。用户会询问具体桌游的规则问题，请快速简洁地回答。\n' +
            '回答要求：\n' +
            '1. 直接给出规则答案，不需要铺垫\n' +
            '2. 回答简洁明了，控制在 3-5 句话内\n' +
            '3. 如果不知道，诚实说"这款游戏的规则我不太确定，建议查阅规则书"\n' +
            '4. 尽量给出实例帮助理解' + shopContext
    };

    var systemPrompt;
    if (mode === 'recommend') {
        systemPrompt = systemPrompts._recommend;
    } else if (mode === 'quick') {
        systemPrompt = systemPrompts._quick;
    } else {
        systemPrompt = systemPrompts[style] || systemPrompts.teacher;
    }

    systemPrompt = antiHallucinationPrefix + '\n' + systemPrompt + gameDataSection;

    try {
        var response = await fetch(SUPABASE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        var data = await response.json();
        if (data.error) {
            throw new Error('API 返回错误: ' + (data.error.message || data.error));
        }
        if (data.choices && data.choices[0]) {
            return data.choices[0].message.content;
        }
        throw new Error('API 调用失败');
    } catch (error) {
        console.error('AI 对话请求失败:', error);
        throw error;
    }
}

function saveConversation(conversation) {
    return true;
}

// ==================== 扫码统计（暂保留 Supabase 接口） ====================

async function logScan(shopId, gameId) {
    console.log('[logScan] 记录扫码, shopId:', shopId, 'gameId:', gameId);
    if (!shopId) {
        console.warn('[logScan] 跳过：shopId 为空，避免写入脏数据');
        return;
    }
    if (!gameId) {
        console.warn('[logScan] 跳过：gameId 为空，避免写入脏数据');
        return;
    }
    try {
        var body = { game_id: gameId, shop_id: shopId };

        var url = SUPABASE_URL + '/rest/v1/scan_logs';
        var response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(body)
        });
        console.log('[logScan] 响应状态:', response.status);
    } catch (e) {
        console.error('[logScan] 错误:', e);
    }
}

async function getScanStats(shopId) {
    console.log('[getScanStats] 查询统计, shopId:', shopId);
    try {
        var headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
        };

        var totalUrl = SUPABASE_URL + '/rest/v1/scan_logs?select=count';
        if (shopId) totalUrl += '&shop_id=eq.' + shopId;
        var totalResp = await fetch(totalUrl, { method: 'GET', headers: headers });
        var totalCount = parseInt((totalResp.headers.get('content-range') || '/0').split('/')[1] || '0');

        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var todayUrl = SUPABASE_URL + '/rest/v1/scan_logs?select=count&scanned_at=gte.' + today.toISOString();
        if (shopId) todayUrl += '&shop_id=eq.' + shopId;
        var todayResp = await fetch(todayUrl, { method: 'GET', headers: headers });
        var todayCount = parseInt((todayResp.headers.get('content-range') || '/0').split('/')[1] || '0');

        var weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        var weekUrl = SUPABASE_URL + '/rest/v1/scan_logs?select=count&scanned_at=gte.' + weekStart.toISOString();
        if (shopId) weekUrl += '&shop_id=eq.' + shopId;
        var weekResp = await fetch(weekUrl, { method: 'GET', headers: headers });
        var weekCount = parseInt((weekResp.headers.get('content-range') || '/0').split('/')[1] || '0');

        return {
            data: { total: totalCount, today: todayCount, week: weekCount },
            error: null
        };
    } catch (e) {
        console.error('[getScanStats] 错误:', e);
        return { data: { total: 0, today: 0, week: 0 }, error: e.message };
    }
}

// ==================== 全局挂载 ====================
// 原有函数（保持兼容）
window.getGames = getGames;
window.getGameDetail = getGameDetail;
window.getShopInfo = getShopInfo;
window.aiChat = aiChat;
window.askAI = askAI;
window.saveConversation = saveConversation;
window.logScan = logScan;
window.getScanStats = getScanStats;

// 认证函数
window.authRegister = authRegister;
window.authLogin = authLogin;
window.authGetMe = authGetMe;
window.authLogout = authLogout;
window.isLoggedIn = isLoggedIn;
window.getToken = getToken;
window.updateStoreProfile = updateStoreProfile;

// 管理端 API
window.getMyGames = getMyGames;
window.getMyGameDetail = getMyGameDetail;
window.createGame = createGame;
window.updateGame = updateGame;
window.deleteGame = deleteGame;
window.getGameRules = getGameRules;
window.saveGameRules = saveGameRules;

// 上传 API
window.uploadCover = uploadCover;
window.uploadRules = uploadRules;
window.getUploads = getUploads;

// 玩家端公开 API
window.getGlobalGames = getGlobalGames;
window.getGlobalGame = getGlobalGame;
window.getPublicGames = getPublicGames;
window.getPublicGame = getPublicGame;
window.getAuthHeaders = getAuthHeaders;
window.normalizeGameData = normalizeGameData;
window.normalizeSingleGame = normalizeSingleGame;

console.log('[api.js] 加载完成，已挂载到 window');
