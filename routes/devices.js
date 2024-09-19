const db = require('../db');

const express = require('express');
const devicesRouter = express.Router();

// 解绑设备
devicesRouter.delete('/:id(\d+)', unbindDevice);

// 使设备登录校园网
devicesRouter.post('/:id(\d+)/login', loginDevice);

// 使设备登出校园网
devicesRouter.post('/:id(\d+)/logout', logoutDevice);

// 获取设备列表
devicesRouter.get('/', listDevices);

// 解绑设备
function unbindDevice(req, res) {
  try {
    console.debug('DELETE /devices/:id received id=', id);
    const id = req.params.id;
    const info = db.prepare(`DELETE FROM devices WHERE id = ? AND user_id = ?`).run(id, req.userId);
    // 如果没有设备被删除，说明该用户没有该设备
    if (info.changes === 0) {
      return res.status(404).json({ status: 'error', message: 'Device not found' });
    }
    res.json({ status: 'success', message: 'Device unbound successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to unbind device' });
  }
}

// 使设备登录校园网
function loginDevice(req, res) {
  try {
    console.debug('POST /devices/:id/login received id=', id);
    const id = req.params.id;
    const userId = req.userId;
    const deviceIp = db.prepare(`SELECT ip FROM devices WHERE id = ? AND user_id = ?`)
      .pluck().get(id, userId);
    if (!deviceIp) {
      return res.status(404).json({ status: 'error', message: 'Device not found' });
    }
    requestLogin(userId, deviceIp);

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to login device' });
  }
}

// 请求登录校园网
function requestLogin(username, ip) {
  axios.post('https://yxms.byr.ink/api/login', {
    username,
    ip
  }).then(response => {
    if (!response.data.success) {
      return res.json({ status: 'denied', message: 'Login denied' })
    }
    db.prepare(`UPDATE devices SET logged_in = TRUE WHERE id = ?`).run(id);
    res.json({ status: 'success', message: 'Device logged in successfully' })
  }).catch(err => {
      console.error(error);
      return res.status(500).json({ status: 'error', message: 'Failed to request login' });
    });
}

// 使设备登出校园网
function logoutDevice(req, res) {
  try {
    console.debug('POST /devices/:id/logout received id=', id);
    const id = req.params.id;
    const userId = req.userId;
    const info = db.prepare(`UPDATE devices SET logged_in = FALSE WHERE id = ? AND user_id = ?`).run(id, userId);
    if (info.changes === 0) {
      return res.status(404).json({ status: 'error', message: 'Device not found or already logged out' });
    }
    res.json({ status: 'success', message: 'Device logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to logout device' });
  }
}

// 查看该用户设备列表
function listDevices(req, res) {
  try {
    console.debug('GET /devices');
    const devices = db.prepare(`SELECT id, ip, logged_in FROM devices WHERE user_id = ?`).all(req.userId);
    console.debug(`devices of user_id ${req.userId}`, devices);
    res.json({ status: 'success', devices: devices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to list devices' });
  }
};

module.exports = devicesRouter;