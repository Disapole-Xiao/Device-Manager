const db = require('../db');

const expireInterval = 5 * 60 * 1000; // 5分钟
const cleanInterval = 60 * 60 * 1000; // TMP: 清理时间待定 1h 
startTokenCleaner(); // 定期清理 token

// 生成指定长度的字母数字混合验证码
function generateToken(length = 4) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

// 每隔 10 分钟清理过期token
function startTokenCleaner() {
  setInterval(() => 
    db.prepare(`DELETE FROM tokens WHERE due < ?`).run(Date.now()),
    cleanInterval);
}

// 生成并返回 token 用于设备绑定
function bindDevice(req, res) {
  console.debug('POST /bind');
  // 生成不重复token
  try {
    let token;
    while (true) {
      token = generateToken();
      const row = db.prepare(`SELECT * FROM tokens WHERE token = ? AND due > ?`).pluck().get(token, Date.now());
      if (!row) break;
    }
    db.prepare(`INSERT INTO tokens (token, user_id, due) VALUES (?, ?, ?)`)
      .run(token, req.userId, Date.now() + expireInterval);
    
    console.debug('Generated token:', token);
    res.json({ status: 'success', token: token });
    
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: 'error', message: 'Failed to bind device' });
  }
};

module.exports = bindDevice;
