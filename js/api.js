/**
 * 桌游AI教练 - API 封装模块
 * 包含 Supabase 和 DeepSeek API 的接口调用
 */

// ==================== Supabase 配置 ====================
var SUPABASE_URL = 'https://theaenpzcmydorhsjquf.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_hZ3n61OfYkOXuqpt9gqKBw_UMA8--10c';

/**
 * 获取游戏列表（支持分类筛选和搜索）
 * @param {object} options - 筛选条件
 * @param {string} options.category - 分类筛选
 * @param {string} options.search - 搜索关键词
 * @param {number} options.limit - 每页数量，默认 20
 * @param {number} options.offset - 偏移量，默认 0
 * @returns {Promise<Array>} 游戏列表
 */
async function getGames(options = {}) {
    console.log('[DEBUG] getGames 被调用, options:', options);
    var category = options.category || '';
    var search = options.search || '';
    var limit = options.limit || 100;
    var offset = options.offset || 0;

    var queryParams = [
        'select=*',
        'order=name.asc',
        'limit=' + limit,
        'offset=' + offset
    ];

    if (category && category !== '全部') {
        queryParams.push('category=eq.' + encodeURIComponent(category));
    }
    if (search) {
        queryParams.push('name=ilike.*' + encodeURIComponent(search) + '*');
    }

    var query = SUPABASE_URL + '/rest/v1/games?' + queryParams.join('&');

    try {
        var response = await fetch(query, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('获取游戏列表失败:', response.status, response.statusText);
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error('获取游戏列表异常:', error);
        return [];
    }
}

/**
 * 获取游戏详情
 * @param {string} id - 游戏ID
 * @returns {Promise<object|null>} 游戏详情
 */
async function getGameDetail(id) {
    var query = SUPABASE_URL + '/rest/v1/games?id=eq.' + id + '&select=*';

    try {
        var response = await fetch(query, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('获取游戏详情失败:', response.status, response.statusText);
            return null;
        }

        var data = await response.json();
        return data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error('获取游戏详情异常:', error);
        return null;
    }
}

/**
 * AI 对话接口（通过 Supabase Edge Function 代理）
 * @param {Array} messages - 消息历史 [{role, content}]
 * @param {string} gameName - 游戏名称
 * @param {string} mode - 当前模式 (setup/teach/faq)
 * @param {string} style - 语言风格 (teacher/friend/dict)
 * @returns {Promise<string>} AI 回复
 */
async function aiChat(messages, gameName, mode, style) {
    // Supabase Edge Function 地址
    var SUPABASE_FUNCTION_URL = 'https://theaenpzcmydorhsjquf.supabase.co/functions/v1/deepseek-proxy';

    // 构建系统提示词
    var systemPrompts = {
        teacher: '你是一位专业的桌游教练"正经老师"。你正在教用户玩《' + gameName + '》。\n' +
            '当前模式：' + (mode === 'setup' ? '摆盘引导' : mode === 'teach' ? '规则教学' : '规则速查') + '。\n' +
            '回答规则：\n' +
            '1. 规则模糊的问题 → 给出合理建议，说明"规则书未明确规定"\n' +
            '2. 策略问题 → 可以回答，标注"⚠️ 策略建议，非规则"\n' +
            '3. 边角情况 → 尽量回答，附"📖 请参考规则书确认"\n' +
            '4. 超范围问题 → 简要回答，推荐跳转对应桌游\n' +
            '用简洁清晰的中文回答，适当分段。',
        friend: '你是一位热情友好的桌游爱好者"热情朋友"！你正在教用户玩《' + gameName + '》。\n' +
            '语气轻松活泼，多用emoji，像朋友一样聊天。当前模式：' + (mode === 'setup' ? '摆盘引导' : mode === 'teach' ? '规则教学' : '规则速查') + '。\n' +
            '回答规则同上，但语气更随意有趣。',
        dict: '你是《' + gameName + '》规则词典。只输出精炼的事实性答案，不废话。\n' +
            '格式：直接给结论 → 简要解释。当前模式：' + (mode === 'setup' ? '摆盘引导' : mode === 'teach' ? '规则教学' : '规则速查') + '。'
    };

    var systemPrompt = systemPrompts[style] || systemPrompts.teacher;

    try {
        var response = await fetch(SUPABASE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sb_publishable_hZ3n61OfYkOXuqpt9gqKBw_UMA8--10c'
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
        console.log('Edge Function 返回:', data);

        if (data.error) {
            console.error('具体错误:', JSON.stringify(data));
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

/**
 * 保存对话记录
 * @param {object} conversation - 对话数据
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveConversation(conversation) {
    // TODO: 实现保存对话记录逻辑
    return true;
}

// ==================== 全局导出 ====================
// 传统 script 加载方式需要挂载到 window
window.getGames = getGames;
window.getGameDetail = getGameDetail;
window.aiChat = aiChat;
window.saveConversation = saveConversation;
