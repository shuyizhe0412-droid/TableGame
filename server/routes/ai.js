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

    // 1. 读取游戏信息
    const { data: games, error: dbErr } = await supabase
      .from('store_games')
      .select('name, rules_text, category')
      .eq('id', game_id)
      .limit(1);

    if (dbErr) throw dbErr;
    if (!games || games.length === 0) {
      return res.status(404).json({ error: '游戏不存在' });
    }

    const game = games[0];
    const gameName = game.name || '该游戏';
    const gameCategory = game.category || '桌游';
    const rules_text = game.rules_text;

    // 2. 构建 system prompt（根据是否有规则文本分别处理）
    let systemPrompt;
    
    if (rules_text && rules_text.trim() !== '') {
      // 有规则文本：严格基于规则回答
      systemPrompt =
        '你是一个专业的桌游规则教练。严格基于以下规则内容回答玩家的问题。\n' +
        '如果规则中没有提到相关内容，请回答"这部分规则中没有记录，建议查阅官方规则书"。\n' +
        '回答要简洁明了，适合桌游场景。\n\n' +
        '游戏名称：' + gameName + '\n' +
        '规则内容：\n' + rules_text;
      console.log('[AI] 提问（有规则）| game:', gameName, '| question length:', question.length);
    } else {
      // 无规则文本：基于通用知识回答，必须加声明
      systemPrompt =
        '你是一个专业的桌游规则教练。该游戏名称是「' + gameName + '」，分类是「' + gameCategory + '」。\n' +
        '请基于你的通用知识回答玩家关于这款游戏的问题。\n\n' +
        '重要提醒：你没有该游戏的官方规则文本，所以：\n' +
        '1. 尽量基于你的通用知识回答问题\n' +
        '2. 在每个回答的末尾必须加上以下声明（单独一行）：\n' +
        '   ⚠️ 以上为AI通用回答，未参考店家上传的官方规则，实际规则请以官方说明书为准。\n' +
        '3. 如果你不确定答案，请坦诚告知玩家\n\n' +
        '回答要简洁明了，适合桌游场景。';
      console.log('[AI] 提问（无规则，使用通用知识）| game:', gameName, '| question length:', question.length);
    }

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