const ping = require('ping');
const db = require('./db');

class Pinger {
  deviceTimers = new Map(); // {ip: timer}
  pingConfig = {
    timeout: 10,
  };
  pingInterval = Number(process.env.PING_INTERVAL) || 30 * 60 * 1000; // 30 min

  constructor() { // 读取数据库已登录的设备并保活
    db.selectOnlineDevices.all().forEach(row => {
      this.addTimer(row.ip);
    });
    
  }
  addTimer(ip) {
    const timer = setInterval(() => {
      this.pingDevice(ip);
    }, this.pingInterval);
    this.deviceTimers.set(ip, timer);
    console.debug(`Add timer for ${ip}`);
  }

  removeTimer(ip) {
    clearInterval(this.deviceTimers.get(ip));
    this.deviceTimers.delete(ip);
    console.debug(`Remove timer for ${ip}`);
  }

  async pingDevice(ip) {
    try {
      const res = await ping.promise.probe(ip, this.pingConfig);
      if (!res.alive) {
        // 如果无法 ping 通，说明已下线
        this.removeTimer(ip);
        db.updateDeviceByIp.run(0, ip); // 更新数据库
        console.debug(`${ip} didn't reply, set logged_out`);
        return;
      }
      console.debug(`ping ${ip} alive`);
    } catch (error) {
      console.error(`Error pinging ${ip}:`, error);
    }
  }
}

const pinger = new Pinger();
module.exports = pinger;
