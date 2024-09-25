const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
const { handleAuthCallback, authMiddleware } = require('./routes/auth');
const bindDevice = require('./routes/bind');
const verifyDevice = require('./routes/verify');
const devicesRouter = require('./routes/devices');


const PORT = Number(process.env.PORT) || 5000;
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json(), cookieParser());

// 发送 token
app.post("/bind", authMiddleware, bindDevice);
// 绑定设备
app.post('/verify', verifyDevice);
// 解绑设备
app.use('/devices', authMiddleware, devicesRouter);
// 用户认证
app.get('/auth', handleAuthCallback);

// 测试界面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
})


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on ${process.env.BASE_URL}:${PORT}`)
});