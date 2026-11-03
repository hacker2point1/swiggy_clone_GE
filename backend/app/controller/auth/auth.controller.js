
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../../models/user/user.model");
const RefreshToken = require("../../models/refreshToken/refreshToken.model");
const OTP = require("../../models/otp/otp.model");

const generateAccessToken = require("../../utils/token/generateAccessToken");
const generateRefreshToken = require("../../utils/token/generateRefreshToken");
const verifyRefreshToken = require("../../utils/token/verifyRefreshToken");
const sendEmail = require("../../utils/email/sendEmail");

const authCookiePath = "/api/v1/auth";

class AuthController {
  // Generate and store tokens
  async issueTokens(user, res) {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const decoded = jwt.decode(refreshToken);

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await RefreshToken.create({
      user: user._id,
      tokenHash,
      expiresAt: new Date(decoded.exp * 1000),
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: authCookiePath,
    });

    return accessToken;
  }

  // REGISTER
  async register(req, res) {
    try {
      const { name, email, phone, password, confirm_password } = req.body;

      if (!name || !email || !password || !confirm_password) {
        return res.status(400).json({
          success: false,
          message: "Name, email, password and confirm password are required",
        });
      }

      if (password !== confirm_password) {
        return res.status(400).json({
          success: false,
          message: "Password and confirm password do not match",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must contain at least 6 characters",
        });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must contain at least 2 characters",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
      });

      if (existingUser) {
        if (!existingUser.isEmailVerified) {
          await sendEmail(req, existingUser);

          return res.status(200).json({
            success: true,
            message: "A new verification OTP has been sent",
          });
        }

        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }

      if (phone) {
        const existingPhone = await User.findOne({
          phone: phone.trim(),
        });

        if (existingPhone) {
          return res.status(409).json({
            success: false,
            message: "Phone number already registered",
          });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      // Public registration always creates a normal user
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone?.trim(),
        password: hashedPassword,
        role: "user",
        isActive: true,
        isBlocked: false,
        isEmailVerified: false,
      });

      await sendEmail(req, user);

      return res.status(201).json({
        success: true,
        message: "Registration successful. Verify your email using the OTP.",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // VERIFY OTP
  async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      const user = await User.findOne({
        email: email.trim().toLowerCase(),
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      const otpData = await OTP.findOne({
        userId: user._id,
        otp,
      });

      if (!otpData) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      user.isEmailVerified = true;
      await user.save();

      await OTP.deleteMany({
        userId: user._id,
      });

      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // LOGIN
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const user = await User.findOne({
        email: email.trim().toLowerCase(),
      }).select("+password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: "Please verify your email before logging in",
        });
      }

      if (user.isBlocked || !user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your account is blocked or inactive",
        });
      }

      const isPasswordMatched = await bcrypt.compare(
        password,
        user.password
      );

      if (!isPasswordMatched) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Remove previous sessions for single-session login
      await RefreshToken.deleteMany({
        user: user._id,
      });

      const accessToken = await this.issueTokens(user, res);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        accessToken,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profileImage: user.profileImage,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // REFRESH TOKEN
  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Refresh token not found",
        });
      }

      const decoded = verifyRefreshToken(refreshToken);

      const tokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      const storedToken = await RefreshToken.findOne({
        user: decoded.id,
        tokenHash,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      });

      if (!storedToken) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired refresh token",
        });
      }

      const user = await User.findById(decoded.id);

      if (!user || user.isBlocked || !user.isActive) {
        return res.status(403).json({
          success: false,
          message: "User account is unavailable",
        });
      }

      // Revoke old token
      storedToken.isRevoked = true;
      storedToken.revokedAt = new Date();

      await storedToken.save();

      const accessToken = await this.issueTokens(user, res);

      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        accessToken,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }
  }

  // LOGOUT
  async logout(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (refreshToken) {
        const tokenHash = crypto
          .createHash("sha256")
          .update(refreshToken)
          .digest("hex");

        await RefreshToken.findOneAndUpdate(
          {
            user: req.user.id,
            tokenHash,
            isRevoked: false,
          },
          {
            isRevoked: true,
            revokedAt: new Date(),
          }
        );
      }

      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: authCookiePath,
      });

      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET PROFILE
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // UPDATE PROFILE
  async updateProfile(req, res) {
    try {
      const { name, phone, profileImage } = req.body;

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (name !== undefined) {
        if (name.trim().length < 2 || name.trim().length > 100) {
          return res.status(400).json({
            success: false,
            message: "Name must be between 2 and 100 characters",
          });
        }

        user.name = name.trim();
      }

      if (phone !== undefined) {
        const normalizedPhone = phone.trim();

        if (normalizedPhone) {
          const existingPhone = await User.findOne({
            phone: normalizedPhone,
            _id: { $ne: user._id },
          });

          if (existingPhone) {
            return res.status(409).json({
              success: false,
              message: "Phone number already registered",
            });
          }
        }

        user.phone = normalizedPhone;
      }

      if (profileImage !== undefined) {
        user.profileImage = profileImage;
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profileImage: user.profileImage,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new AuthController();
