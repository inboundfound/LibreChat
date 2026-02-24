const express = require('express');
const axios = require('axios');
const { createSetBalanceConfig } = require('@librechat/api');
const {
  resetPasswordRequestController,
  resetPasswordController,
  registrationController,
  graphTokenController,
  refreshController,
} = require('~/server/controllers/AuthController');
const {
  regenerateBackupCodes,
  disable2FA,
  confirm2FA,
  enable2FA,
  verify2FA,
} = require('~/server/controllers/TwoFactorController');
const { verify2FAWithTempToken } = require('~/server/controllers/auth/TwoFactorAuthController');
const { logoutController } = require('~/server/controllers/auth/LogoutController');
const { loginController } = require('~/server/controllers/auth/LoginController');
const { getAppConfig } = require('~/server/services/Config');
const middleware = require('~/server/middleware');
const { Balance } = require('~/db/models');

const setBalanceConfig = createSetBalanceConfig({
  getAppConfig,
  Balance,
});

const router = express.Router();

const ldapAuth = !!process.env.LDAP_URL && !!process.env.LDAP_USER_SEARCH_BASE;
//Local
router.post('/logout', middleware.requireJwtAuth, logoutController);
router.post(
  '/login',
  middleware.logHeaders,
  middleware.loginLimiter,
  middleware.checkBan,
  ldapAuth ? middleware.requireLdapAuth : middleware.requireLocalAuth,
  setBalanceConfig,
  loginController,
);
router.post('/refresh', refreshController);
router.post(
  '/register',
  middleware.registerLimiter,
  middleware.checkBan,
  middleware.checkInviteUser,
  middleware.validateRegistration,
  registrationController,
);
router.post(
  '/requestPasswordReset',
  middleware.resetPasswordLimiter,
  middleware.checkBan,
  middleware.validatePasswordReset,
  resetPasswordRequestController,
);
router.post(
  '/resetPassword',
  middleware.checkBan,
  middleware.validatePasswordReset,
  resetPasswordController,
);

router.get('/2fa/enable', middleware.requireJwtAuth, enable2FA);
router.post('/2fa/verify', middleware.requireJwtAuth, verify2FA);
router.post('/2fa/verify-temp', middleware.checkBan, verify2FAWithTempToken);
router.post('/2fa/confirm', middleware.requireJwtAuth, confirm2FA);
router.post('/2fa/disable', middleware.requireJwtAuth, disable2FA);
router.post('/2fa/backup/regenerate', middleware.requireJwtAuth, regenerateBackupCodes);

router.get('/graph-token', middleware.requireJwtAuth, graphTokenController);

router.post('/xofu/login', middleware.requireJwtAuth, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('[xofuLogin] Attempting login to xofu.com for:', email);

    // Proxy the login request to xofu.com
    const loginResponse = await axios.post(
      'https://xofu.com/api/v1/login/',
      {
        email,
        password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
      },
    );

    console.log('[xofuLogin] Login successful, status:', loginResponse.status);
    console.log('[xofuLogin] Response data structure:', JSON.stringify(loginResponse.data, null, 2));
    console.log('[xofuLogin] Response headers:', loginResponse.headers);

    // Check if xofu.com set any cookies in the response
    const setCookieHeader = loginResponse.headers['set-cookie'];
    console.log('[xofuLogin] Set-Cookie headers:', setCookieHeader);

    // Extract token from response body first
    let token =
      loginResponse.data.token ||
      loginResponse.data.access_token ||
      loginResponse.data.access ||
      loginResponse.data.jwt ||
      loginResponse.data.data?.token ||
      loginResponse.data.data?.access;

    // If no token in body, try to extract from cookies
    if (!token && setCookieHeader) {
      console.log('[xofuLogin] No token in body, checking cookies...');
      // Parse Set-Cookie headers to find token
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

      for (const cookieStr of cookies) {
        // Common token cookie names (case-insensitive)
        const tokenMatch = cookieStr.match(/^(token|access_?token|auth_?token|jwt|access)=([^;]+)/i);
        if (tokenMatch) {
          token = tokenMatch[2];
          console.log('[xofuLogin] Found token in cookie:', tokenMatch[1]);
          break;
        }
      }
    }

    if (!token) {
      console.error('[xofuLogin] No token found in response body or cookies');
      console.error('[xofuLogin] Response data:', loginResponse.data);
      console.error('[xofuLogin] Response cookies:', setCookieHeader);
      return res.status(500).json({
        message: 'No authentication token received from xofu',
        debug: {
          responseKeys: Object.keys(loginResponse.data),
          hasCookies: !!setCookieHeader,
        },
      });
    }

    console.log('[xofuLogin] Token extracted successfully (length:', token.length, ')');

    // Set cookie with 30-day expiration
    const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('xofuAuthToken', token, {
      expires: expirationDate,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
    });

    console.log('[xofuLogin] Cookie set successfully');

    return res.status(200).json({
      message: 'Login successful',
      expiresAt: expirationDate.toISOString(),
    });
  } catch (error) {
    console.error('[xofuLogin] Error:', error.message);

    if (error.response) {
      // xofu API returned an error
      const status = error.response.status;
      if (status === 401 || status === 403) {
        return res.status(401).json({ message: 'Invalid email or password' });
      } else if (status === 404) {
        return res.status(503).json({ message: 'xofu login service unavailable' });
      } else {
        return res
          .status(status)
          .json({ message: error.response.data?.message || 'Login failed' });
      }
    } else if (error.request) {
      // Request made but no response
      console.error('[xofuLogin] No response from xofu.com');
      return res.status(503).json({ message: 'Unable to connect to xofu' });
    } else {
      // Error setting up request
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
});

module.exports = router;
