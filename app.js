const express = require('express');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { handleAuthCallback, authMiddleware } = require('./routes/auth');
const bindDevice = require('./routes/bind');
const verifyDevice = require('./routes/verify');
const devicesRouter = require('./routes/devices');
const { default: axios } = require('axios');



const app = express();
dotenv.config();
const PORT = Number(process.env.PORT) || 5000;

const path = require('path'); //
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json(), cookieParser());
app.use((res, req, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
})

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
  console.log(`Server listening on http://localhost:${PORT}`)
});