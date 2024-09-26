const db = require('../db');

// 绑定设备
function verifyDevice(req, res) {
  try {
    const token = req.body.token.toUpperCase(); // 忽略大小写
    const deviceIp = req.ip;
    console.debug('>>> POST /verify  token=', token);
    const userId = db
      .prepare(`SELECT user_id FROM tokens WHERE token = ? AND due > ?`)
      .pluck()
      .get(token, Date.now());
    if (!userId) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Invalid or expired token' });
    }
    db.prepare(`DELETE FROM tokens WHERE token = ? AND due > ?`).run(token, Date.now());
    db.prepare(`INSERT INTO devices (user_id, ip, logged_in) VALUES (?, ?, TRUE)`).run(
      userId,
      deviceIp
    );
    console.debug(`user ${userId} bound device ${deviceIp}`);
    res.json({ status: 'success', message: 'Device bound successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to verify device' });
  }
}

module.exports = verifyDevice;
