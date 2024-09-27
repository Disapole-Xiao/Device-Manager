const axios = require('axios');
const express = require('express');
const db = require('../db');
const pinger = require('../pinger');
const devicesRouter = express.Router();
const LOGIN_PROXY = process.env.LOGIN_PROXY || 'http://localhost/api/login';

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
    const { ip } = db.selectUserDeviceById.get(id, req.userId) ?? {};
    if (!ip) {
      console.debug(`Device ${id} not found`);
      return res.status(404).json({ status: 'error', message: 'Device not found' });
    }
    db.deleteDevice.run(id);
    pinger.removeTimer(ip)
    console.debug(`Device ${id} ${ip} unbound`);
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
    const { ip } = db.selectUserDeviceById.get(id, userId) ?? {};
    if (!ip) {
      console.debug(`Device ${id} not found`);
      return res.status(404).json({ status: 'error', message: 'Device not found' });
    }
    // 代登录
    const response = await axios.post(LOGIN_PROXY, {
      username: userId,
      ip: ip,
    });
    if (!response.data.success) {
      console.debug(`Device ${id} ${ip} login denied:`, response.data);
      return res.json({ status: 'denied', message: response.data.error });
    }
    console.debug(`Device ${id} ${ip} login success`);
    db.updateDeviceById.run(1, id);
    pinger.addTimer(ip); // 保活
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
    const { ip, logged_in } = db.selectUserDeviceById.get(id, userId) ?? {};
    if (!ip) {
      console.debug(`Device ${id} not found`);
      return res.status(404).json({ status: 'error', message: 'Device not found' });
    }
    if (!logged_in) {
      console.debug(`Device ${id} ${ip} already logged out`);
      return res.json({ status: 'success', message: 'Device already logged out' });
    }
    db.updateDeviceById.run(0, id);
    pinger.removeTimer(ip);
    console.debug(`Device ${id} ${ip} logged out`);
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
    let devices = db.selectUserDevices.all(req.userId);
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
