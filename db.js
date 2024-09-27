const Database = require('better-sqlite3');

const db = new Database('./db.sqlite' /*, { verbose: console.debug }*/);

db.prepare(
  `
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      ip TEXT NOT NULL UNIQUE ON CONFLICT REPLACE,
      logged_in BOOLEAN
    )
  `
).run();

db.prepare(
  `
    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      due INTEGER NOT NULL
    )
  `
).run();

const stmt = {
  /************** DEVICES **************/
  /**
   * @param {number} id
   * @param {string} user_id
   */
  selectUserDeviceById: db.prepare(`SELECT * FROM devices WHERE id = ? AND user_id = ?`),
  
  /**
   * @param {string} user_id
   */
  selectUserDevices: db.prepare(`SELECT id, ip, logged_in FROM devices WHERE user_id = ?` ),
  
  /**
   * @param {string} ip
   */
  selectOnlineDevices: db.prepare(`SELECT * FROM devices WHERE logged_in = TRUE`),
  
  /**
   * @param {string} user_id
   * @param {string} ip
   * @param {0 | 1} logged_in
   */
  insertDevice: db.prepare(`INSERT INTO devices (user_id, ip, logged_in) VALUES (?, ?, ?)`),
  
  /**
   * @param {0 | 1} logged_in
   * @param {number} id
   */
  updateDeviceById: db.prepare(`UPDATE devices SET logged_in = ? WHERE id = ?`),
  
  /**
   * @param {0 | 1} logged_in
   * @param {string} ip
   */
  updateDeviceByIp: db.prepare(`UPDATE devices SET logged_in = ? WHERE ip = ?`),
  
  /**
   * @param {number} id
   */
  deleteDevice: db.prepare(`DELETE FROM devices WHERE id = ?`),

  /*************** TOKENS ****************/
  /**
   * @param {string} token
   * @param {number} due
   */
  selectValidToken: db.prepare(`SELECT * FROM tokens WHERE token = ? AND due > ?`),
  
  /**
   * @param {string} token
   * @param {string} user_id
   * @param {number} due
   */
  insertToken: db.prepare(`INSERT INTO tokens (token, user_id, due) VALUES (?, ?, ?)`),
  
  /**
   * @param {string} token
   */
  deleteToken: db.prepare(`DELETE FROM tokens WHERE token = ?`),

  /**
   * @param {number} due
   */
  deleteExpiredTokens: db.prepare(`DELETE FROM tokens WHERE due < ?`),
};
module.exports = stmt;
