/**
 * AI 规则问答路由（DeepSeek）
 * POST /api/ai/ask — 无需认证，玩家可用
 */
const express = require('express');
const OpenAI = require('openai');
const supabase = require('../config/supabase');

const router = express.Router();

// DeepSeek 客户端改为惰性初始化，避免启动时光标为空导致认证失败
function getOpenAI() {
  const key = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (!key) throw new Error('DEEPSEEK_API_KEY 未配置');
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: key,
    timeout: 30000,
  });
}

/** POST /api/ai/ask — AI 规则问答 */
router.post('/ask', async (req, res) => {
  try {
    const { game_id, question } = req.body;

    if (!game_id || !question) {
      return res.status(400).json({ error: '请提供 game_id 和 question' });
    }

    // 1. 读取规则内容
    const { data: games, error: dbErr } = await supabase
      .from('store_games')
      .select('name, rules_text')
      .eq('id', game_id)
      .limit(1);

    if (dbErr) throw dbErr;
    if (!games || games.length === 0) {
      return res.status(404).json({ error: '游戏不存在' });
    }

    const rules_text = games[0].rules_text;

    if (!rules_text || rules_text.trim() === '') {
      return res.json({ answer: '该游戏暂未添加规则，请联系店家添加。' });
    }

    // 2. 构建 system prompt
    const systemPrompt =
      '你是一个专业的桌游规则教练。基于以下规则内容回答玩家的问题。\n' +
      '如果问题超出规则范围，礼貌地告知你只能回答规则相关问题。\n' +
      '回答要简洁明了，适合桌游场景。\n\n' +
      '规则内容：\n' + rules_text;

    console.log('[AI] 提问 | game:', games[0].name, '| question length:', question.length);

    // 3. 调用 DeepSeek
    const completion = await getOpenAI().chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const answer = completion.choices[0]?.message?.content || 'AI 返回为空，请重试。';
    console.log('[AI] 回答 | length:', answer.length);

    res.json({ answer });
  } catch (err) {
    console.error('[AI] 调用失败:', err.message);

    // 区分 API 认证错误
    if (err.status === 401 || err.message?.includes('Authentication')) {
      return res.json({ answer: 'AI 服务配置异常，请联系管理员。' });
    }

    res.json({ answer: 'AI 暂时无法回答，请稍后再试。' });
  }
});

module.exports = router;