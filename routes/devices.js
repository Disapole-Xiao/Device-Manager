const db = require('../db');
const axios = require('axios');
const express = require('express');
const devicesRouter = express.Router();
const LOGIN_PROXY = process.env.LOGIN_PROXY ?? 'http://localhost/api/login';

// 解绑设备
devicesRouter.delete('/:id(\\d+)', unbindDevice);

// 使设备登录校园网
devicesRouter.post('/:id(\\d+)/login', loginDevice);

// 使设备登出校园网
devicesRouter.post('/:id(\\d+)/logout', logoutDevice);

// 获取设备列表
devicesRouter.get('/', listDevices);

// 解绑设备
function unbindDevice(req, res) {
  try {
    const id = req.params.id;
    console.debug(`>>> DELETE /devices/${id}`);
    const info = db
      .prepare(`DELETE FROM devices WHERE id = ? AND user_id = ?`)
      .run(id, req.userId);
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
async function loginDevice(req, res) {
  try {
    const id = req.params.id;
    console.debug(`>>> POST /devices/${id}/login`);
    const userId = req.userId;
    const deviceIp = db
      .prepare(`SELECT ip FROM devices WHERE id = ? AND user_id = ?`)
      .pluck()
      .get(id, userId);
    if (!deviceIp) {
      return res.status(404).json({ status: 'error', message: 'Device not found' });
    }
    // 代登录
    const response = await axios.post(LOGIN_PROXY, {
      username: userId,
      ip: deviceIp,
    });
    if (!response.data.success) {
      console.log('Login denied:', response.data);
      return res.json({ status: 'denied', message: response.message });
    }
    console.log('Login success');
    db.prepare(`UPDATE devices SET logged_in = TRUE WHERE id = ?`).run(id);
    res.json({ status: 'success', message: 'Device logged in successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to login device' });
  }
}

// 使设备登出校园网
function logoutDevice(req, res) {
  try {
    const id = req.params.id;
    console.debug(`>>> POST /devices/${id}/logout`);
    const userId = req.userId;

    const info = db
      .prepare(`UPDATE devices SET logged_in = FALSE WHERE id = ? AND user_id = ?`)
      .run(id, userId);
    if (info.changes === 0) {
      return res
        .status(404)
        .json({ status: 'error', message: 'Device not found or already logged out' });
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
    console.debug('>>> GET /devices');
    let devices = db
      .prepare(`SELECT id, ip, logged_in FROM devices WHERE user_id = ?`)
      .all(req.userId);
    devices = devices.map(device => {
      device.logged_in = Boolean(device.logged_in);
      return device;
    });
    console.debug(`devices of user_id ${req.userId}`, devices);
    res.json({ status: 'success', devices: devices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Failed to list devices' });
  }
}

module.exports = devicesRouter;
