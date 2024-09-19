const axios = require('axios');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// 请求登录预授权码
function requestAuth(req, res) {
  const app_id = process.env.APP_ID;
  const redirect_uri = process.env.BASE_URL + '/auth';
  const scope = 'contact:user.employee_id:readonly';
  const feishu = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${app_id}&redirect_uri=${redirect_uri}&scope=${scope}`
  console.debug('Redirect to Feishu:', feishu)
  // 返回包含飞书认证链接的 HTML 页面
  res.send(`
    <div>
      <h1>绑定飞书账号</h1>
      <p>点击下方按钮，跳转到飞书进行认证。</p>
      <a href="${feishu}">
        <button>绑定飞书</button>
      </a>
    </div>
  `);
}

// 获取 app_access_token
async function getAppAccessToken(app_id, app_secret) {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      data: {
        app_id,
        app_secret
      }
    });

    // 检查返回的结果
    if (response.data.code !== 0) {
      throw new Error(response.data.msg);
    }
    console.debug('Get app access token:', response.data.app_access_token);
    return response.data.app_access_token;
  } catch (error) {
    throw new Error('Failed to get app_access_token:' + error.msg);
  }
}


// 获取 user_access_code
async function getUserAccessCode(app_access_token, code) {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token',
      headers: {
        'Authorization': `Bearer ${app_access_token}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      data: {
        'grant_type': 'authorization_code',
        'code': code
      }
    });
    if (response.data.code !== 0) {
      throw new Error(response.data.msg);
    }
    console.debug('Get user access code:', response.data.data.access_token);
    return response.data.data.access_token;

  } catch {
    throw new Error('Failed to get user_access_code:' + error.msg);
  }
}

// 获取登录用户信息
async function getUserInfo(user_access_token) {
  try {
    const response = await axios({
      method: 'GET',
      url: 'https://open.feishu.cn/open-apis/authen/v1/user_info',
      headers: {
        'Authorization': `Bearer ${user_access_token}`
      }
    });
    if (response.data.code !== 0) {
      throw new Error(response.data.msg);
    }
    console.debug('Get user info:', response.data.data);
    return response.data.data;
  } catch (error) {
    throw new Error('Failed to get user info:' + error.msg);
  }
}

// 授权回调函数
async function handleAuthCallback(req, res) {
  try {
    if (req.query.error) {
      console.debug(req.query.error);
      return res.redirect('/');
    }
    console.debug('Auth callback: get code: ', req.query.code);
    const code = req.query.code,
      app_id = process.env.APP_ID,
      app_secret = process.env.APP_SECRET,
      app_access_token = await getAppAccessToken(app_id, app_secret),
      user_access_token = await getUserAccessCode(app_access_token, code),
      user_info = await getUserInfo(user_access_token),
      token = generateJWT(user_info.user_id);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60 * 1000 // TMP: Cookie 的有效期为 24 小时
    });
    console.debug('JWT generated: ', token);
    res.redirect('/');
  } catch (error) {
    res.send('Authorization failed:' + error.msg);
  }
}

// 生成 JWT
function generateJWT(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '6h' }); // TMP: 过期时间可以再调整
}

// 验证 JWT 的中间件
function authMiddleware(req, res, next) {
  const token = req.cookies.jwt;

  if (!token) {
    return requestAuth(req, res);
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return requestAuth(req, res);
    }
    req.userId = decoded.userId; // 将解码的用户信息存入 req.userId
    console.debug('JWT verified, user_id=', decoded.userId);
    next();
  });
}

module.exports = { handleAuthCallback, authMiddleware };