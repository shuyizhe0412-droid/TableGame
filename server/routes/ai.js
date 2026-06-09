/**
 * AI 规则问答路由（DeepSeek）
 * POST /api/ai/ask — 一次性返回（兼容旧版）
 * POST /api/ai/ask-stream — 流式返回（SSE）
 * 无需认证，玩家可用
 */
const express = require('express');
const OpenAI = require('openai');
const supabase = require('../config/database');

const router = express.Router();

// DeepSeek 客户端惰性初始化
function getOpenAI() {
  const key = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (!key) throw new Error('DEEPSEEK_API_KEY 未配置');
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: key,
    timeout: 60000,
    maxRetries: 0,
  });
}

// 读取游戏信息（共用）
async function getGameInfo(game_id) {
  // 先查 store_games
  const { data: storeGames } = await supabase
    .from('store_games')
    .select('name, game_name, rules_text, category, description')
    .eq('id', game_id)
    .limit(1);

  if (storeGames && storeGames.length > 0) {
    const g = storeGames[0];
    return {
      name: g.name || g.game_name || '该游戏',
      category: g.category || '桌游',
      rules_text: g.rules_text || '',
      description: g.description || '',
      source: 'store_games'
    };
  }

  // 再查 global_games
  const { data: globalGames } = await supabase
    .from('global_games')
    .select('game_name, tags, description')
    .eq('id', game_id)
    .limit(1);

  if (globalGames && globalGames.length > 0) {
    const g = globalGames[0];
    return {
      name: g.game_name || '该游戏',
      category: Array.isArray(g.tags) ? g.tags.join('、') : (g.tags || '桌游'),
      rules_text: '',
      description: g.description || '',
      source: 'global_games'
    };
  }

  return null;
}

// 构建 system prompt（共用）
function buildSystemPrompt(game, mode) {
  const gameName = game.name;
  const gameCategory = game.category;
  const rules_text = game.rules_text;

  const modeInstructions = {
    setup: '你是摆盘引导助手。根据玩家人数，一步步教他们如何摆放游戏配件。每一步只说一个动作，等玩家确认后再进行下一步。',
    rules: '你是规则教学助手。系统地讲解游戏规则，从基础开始，循序渐进。每个知识点讲完后确认玩家是否理解。',
    faq: '你是规则速查助手。快速准确地回答玩家的具体规则问题，回答要简洁直接。',
    recommend: '你是桌游推荐助手。根据玩家的人数、时间、喜好推荐合适的游戏。'
  };

  const modeText = modeInstructions[mode] || modeInstructions.rules;

  if (rules_text && rules_text.trim() !== '') {
    return modeText + '\n\n' +
      '严格基于以下规则内容回答。如果规则中没有提到，回答"这部分规则中没有记录，建议查阅官方规则书"。\n\n' +
      '游戏名称：' + gameName + '\n' +
      '规则内容：\n' + rules_text;
  } else {
    return modeText + '\n\n' +
      '游戏名称：「' + gameName + '」，分类：「' + gameCategory + '」。\n' +
      '你没有官方规则文本，基于通用知识回答。\n' +
      '每个回答末尾加：⚠️ 以上为AI通用回答，未参考官方规则，实际请以说明书为准。';
  }
}

// ==================== 流式接口 ====================
router.post('/ask-stream', async (req, res) => {
  try {
    const { game_id, question, mode, history } = req.body;

    if (!question) {
      return res.status(400).json({ error: '请提供 question' });
    }

    let game = { name: '桌游', category: '桌游', rules_text: '' };
    if (game_id) {
      const found = await getGameInfo(game_id);
      if (found) game = found;
    }

    const systemPrompt = buildSystemPrompt(game, mode || 'rules');

    // 构建消息列表（支持多轮）
    const messages = [{ role: 'system', content: systemPrompt }];

    // 加入历史对话
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history.slice(-10)) {  // 最多保留最近10轮
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: question });

    console.log('[AI-STREAM] game:', game.name, '| mode:', mode || 'rules', '| history:', (history || []).length, '轮');

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream = await getOpenAI().chat.completions.create({
      model: 'deepseek-v4-pro',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    });

    let fullAnswer = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullAnswer += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // 发送结束标记
    res.write(`data: ${JSON.stringify({ done: true, full: fullAnswer })}\n\n`);
    res.end();

    console.log('[AI-STREAM] 完成 | length:', fullAnswer.length);
  } catch (err) {
    console.error('[AI-STREAM] 错误:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'AI 服务异常，请稍后重试' })}\n\n`);
    res.end();
  }
});

// ==================== 兼容旧接口 ====================
router.post('/ask', async (req, res) => {
  try {
    const { game_id, question } = req.body;

    if (!game_id || !question) {
      return res.status(400).json({ error: '请提供 game_id 和 question' });
    }

    const game = await getGameInfo(game_id);
    if (!game) {
      return res.status(404).json({ error: '游戏不存在' });
    }

    const systemPrompt = buildSystemPrompt(game, 'rules');

    const completion = await getOpenAI().chat.completions.create({
      model: 'deepseek-v4-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const answer = completion.choices[0]?.message?.content || 'AI 返回为空，请重试。';
    res.json({ answer });
  } catch (err) {
    console.error('[AI] 调用失败:', err.message);
    res.json({ answer: 'AI 暂时无法回答，请稍后再试。' });
  }
});

module.exports = router;
