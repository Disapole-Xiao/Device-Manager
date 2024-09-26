const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXP_TIME = process.env.JWT_EXP_TIME ?? '6h'; // 6h
const COOKIE_EXP_TIME = Number(process.env.COOKIE_EXP_TIME) ?? 24 * 60 * 60 * 1000; // 24h
const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;
const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT;

// 请求登录预授权码
function requestAuth(req, res) {
  const app_id = APP_ID;
  const redirect_uri = BASE_URL + ':' + PORT + '/auth';
  const scope = 'contact:user.employee_id:readonly';
  const feishu = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${app_id}&redirect_uri=${redirect_uri}&scope=${scope}`;
  console.debug('...Redirect to Feishu:', feishu);
  // 返回飞书认证链接
  res.send({'link': feishu});
}

// 获取 app_access_token
async function getAppAccessToken(app_id, app_secret) {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      data: {
        app_id,
        app_secret,
      },
    });

    // 检查返回的结果
    if (response.data.code !== 0) {
      throw new Error(response.data.msg);
    }
    console.debug('Get app_access_token=', response.data.app_access_token);
    return response.data.app_access_token;
  } catch (err) {
    throw new Error('Failed to get app_access_token:' + err);
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
        'Content-Type': 'application/json; charset=utf-8',
      },
      data: {
        grant_type: 'authorization_code',
        code: code,
      },
    });
    if (response.data.code !== 0) {
      throw new Error(response.data.msg);
    }
    console.debug('Get user_access_code=', response.data.data.access_token);
    return response.data.data.access_token;
  } catch (err) {
    throw new Error('Failed to get user_access_code:' + err);
  }
}

// 获取登录用户信息
async function getUserInfo(user_access_token) {
  try {
    const response = await axios({
      method: 'GET',
      url: 'https://open.feishu.cn/open-apis/authen/v1/user_info',
      headers: {
        Authorization: `Bearer ${user_access_token}`,
      },
    });
    if (response.data.code !== 0) {
      throw new Error(response.data.msg);
    }
    console.debug('Get user_info=', response.data.data);
    return response.data.data;
  } catch (err) {
    throw new Error('Failed to get user_info:' + err);
  }
}

// 授权回调函数
async function handleAuthCallback(req, res) {
  try {
    if (req.query.err) {
      console.debug(req.query.err);
      return res.status(400).json({status: 'error', message: 'req.query.err'});
    }
    console.debug('Feishu callback: code=', req.query.code);
    const code = req.query.code,
      app_id = APP_ID,
      app_secret = APP_SECRET,
      app_access_token = await getAppAccessToken(app_id, app_secret),
      user_access_token = await getUserAccessCode(app_access_token, code),
      user_info = await getUserInfo(user_access_token),
      userId = user_info.user_id,
      jwt_token = generateJWT(userId);

    // res.cookie('jwt', token, {
    //   httpOnly: true,
    //   // secure: true, // 在非 HTTPS 环境下注释掉这一行
    //   sameSite: 'Strict',
    //   maxAge: COOKIE_EXP_TIME, // Cookie 有效期
    // });

    console.debug('JWT generated:', jwt_token);
    res.json({status: 'success', user_id: userId, jwt: jwt_token});
  } catch (err) {
    console.error(err);
    res.status(500).json({status: 'error', meassage: 'Failed to authorize'});
  }
}

// 生成 JWT
function generateJWT(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXP_TIME });
}

// 验证 JWT 的中间件
function authMiddleware(req, res, next) {
  const authHeader = req.get('Authorization');
  console.log(authHeader);
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    console.debug('vvvv No JWT found, requestAuth');
    return requestAuth(req, res);
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.debug('vvvv Invalid JWT, requestAuth');
      return requestAuth(req, res);
    }
    req.userId = decoded.userId; // 将解码的用户信息存入 req.userId
    console.debug('vvvv JWT verified, user_id=', decoded.userId);
    next();
  });
}

module.exports = { handleAuthCallback, authMiddleware };
