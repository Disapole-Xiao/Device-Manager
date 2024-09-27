const db = require('../db');

// 绑定设备
function verifyDevice(req, res) {
  try {
    const token = req.body.token.toUpperCase(); // 忽略大小写
    const ip = req.ip;
    console.debug('>>> POST /verify  token=', token);
    const { user_id: userId } = db.selectValidToken.get(token, Date.now()) ?? {};
    if (!userId) {
      console.debug('Invalid or expired token');
      return res.status(400).json({ status: 'error', message: 'Invalid or expired token' });
    }
    db.deleteToken.run(token);
    db.insertDevice.run(userId, ip, 1);
    console.debug(`user ${userId} bound device ${ip}`);
    res.json({ status: 'success', message: 'Device bound successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to verify device' });
  }
}

module.exports = verifyDevice;
