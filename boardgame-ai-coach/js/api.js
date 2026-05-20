/**
 * 桌游AI教练 - API 封装模块
 * 包含 Supabase 和 DeepSeek API 的接口调用
 * 依赖 config.js 中的 SUPABASE_URL 和 SUPABASE_ANON_KEY
 */

/**
 * 获取游戏列表
 * @param {object} filters - 筛选条件（可选）
 * @returns {Promise<Array>} 游戏列表
 */
async function getGames(filters) {
    filters = filters || {};
    try {
        console.log('正在连接Supabase...');
        console.log('URL:', SUPABASE_URL);
        
        var url = SUPABASE_URL + '/rest/v1/games?select=*';

        // 筛选条件
        if (filters.category) {
            url += '&category=eq.' + encodeURIComponent(filters.category);
        }
        if (filters.difficulty) {
            url += '&difficulty=eq.' + filters.difficulty;
        }
        if (filters.min_players) {
            url += '&min_players=lte.' + filters.min_players;
        }
        if (filters.max_players) {
            url += '&max_players=gte.' + filters.max_players;
        }

        // 排序
        url += '&order=name.asc';

        console.log('[getGames] 请求:', url);

        var response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('[getGames] 状态码:', response.status);
            var errorText = await response.text();
            console.error('[getGames] 错误:', errorText);
            throw new Error('获取游戏列表失败 (HTTP ' + response.status + '): ' + errorText);
        }

        var games = await response.json();
        console.log('获取到游戏数量:', games?.length, '错误:', null);
        console.log('[getGames] 返回 ' + (games ? games.length : 0) + ' 条');
        return games || [];
    } catch (error) {
        console.error('[getGames] 请求失败:', error);
        console.log('获取到游戏数量:', undefined, '错误:', error.message);
        throw error;
    }
}

/**
 * 获取游戏详情
 * @param {string} id - 游戏ID
 * @returns {Promise<object>} 游戏详情
 */
async function getGameDetail(id) {
    try {
        var url = SUPABASE_URL + '/rest/v1/games?id=eq.' + encodeURIComponent(id) + '&limit=1';

        console.log('[getGameDetail] 请求:', url);

        var response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('[getGameDetail] 状态码:', response.status);
            throw new Error('获取游戏详情失败 (HTTP ' + response.status + ')');
        }

        var games = await response.json();
        console.log('[getGameDetail] 返回:', games && games.length ? games[0].name : 'null');
        return (games && games.length > 0) ? games[0] : null;
    } catch (error) {
        console.error('[getGameDetail] 请求失败:', error);
        throw error;
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
    var SUPABASE_FUNCTION_URL = 'https://theaenpzcmydorhsjqf.supabase.co/functions/v1/deepseek-proxy';

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

// 挂载到全局
window.getGames = getGames;
window.getGameDetail = getGameDetail;
window.aiChat = aiChat;