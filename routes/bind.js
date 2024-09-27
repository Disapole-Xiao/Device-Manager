const db = require('../db');

const TOKEN_EXP_TIME = 5 * 60 * 1000; // 5分钟
const CLEAN_INTERVAL = Number(process.env.CLEAN_INTERVAL) || 60 * 60 * 1000; // 1h

// 每隔一段时间清理过期token
setInterval(() => db.deleteExpiredTokens.run(Date.now()), CLEAN_INTERVAL);

/**  生成指定长度的字母数字混合验证码 */
function generateToken(length = 4) {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// 生成并返回 token 用于设备绑定
function bindDevice(req, res) {
  console.debug('>>> POST /bind');
  // 生成不重复token
  try {
    let token;
    while (true) {
      token = generateToken();
      const { token: tk } = db.selectValidToken.get(token, Date.now()) ?? {};
      if (!tk) break;
    }
    db.insertToken.run(token, req.userId, Date.now() + TOKEN_EXP_TIME);

    console.debug('Token generated:', token);
    res.json({ status: 'success', token: token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 'error', message: 'Failed to bind device' });
  }
}

module.exports = bindDevice;
