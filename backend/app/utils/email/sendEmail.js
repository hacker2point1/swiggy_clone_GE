const transporter = require("../../config/emailConfig");
const OtpModel = require("../../models/otp/otp.model");
const crypto = require("crypto");

const sendEmail = async (req, user) => {
  await OtpModel.deleteMany({ userId: user._id });

  const otp = crypto.randomInt(1000, 10000).toString();

  const otpRecord = await new OtpModel({ userId: user._id, otp }).save();

  const userName =
    user.name ||
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "there";

  try {
    const recipient = user.email.trim().toLowerCase();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@example.com",
      to: recipient,
      subject: "OTP - Verify your account",
      text: `Hello ${userName},\n\nYour verification OTP is ${otp}. This OTP is valid for 15 minutes.`,
      html: `
<div style="max-width:600px;margin:40px auto;font-family:Arial,Helvetica,sans-serif;background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
  <div style="background:#0d6efd;padding:20px;text-align:center;">
    <h2 style="margin:0;color:#ffffff;">Your Company Name</h2>
    <p style="margin:5px 0 0;color:#e9ecef;">Email Verification</p>
  </div>

  <div style="padding:30px;color:#333;line-height:1.7;">
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Thank you for signing up with <strong>Your Company Name</strong>. To complete your registration, please verify your email address using the one-time password below.</p>

    <div style="margin:30px 0;text-align:center;">
      <p style="margin-bottom:10px;font-size:16px;">Your Verification OTP</p>
      <div style="display:inline-block;background:#0d6efd;color:#ffffff;padding:15px 35px;font-size:28px;font-weight:bold;letter-spacing:8px;border-radius:6px;">${otp}</div>
    </div>

    <p style="text-align:center;color:#666;">This OTP is valid for <strong>15 minutes</strong>.</p>

    <div style="margin-top:30px;padding:15px;background:#fff3cd;border-left:5px solid #ffc107;border-radius:4px;">
      <strong>Security Note</strong>
      <p style="margin:10px 0 0;">Never share this OTP with anyone. If you did not create an account, please ignore this email.</p>
    </div>

    <p style="margin-top:35px;">Thank you,<br><strong>Admin Team</strong></p>
  </div>

  <div style="background:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#777;">
    © ${new Date().getFullYear()} Your Company Name. All Rights Reserved.
  </div>
</div>
`,
    });

    const accepted = Array.isArray(info.accepted) && info.accepted.some((address) => {
      const acceptedAddress =
        typeof address === "string" ? address : address.address;
      return acceptedAddress?.toLowerCase() === recipient;
    });

    if (!accepted) {
      throw new Error("Email provider did not accept the verification email");
    }

    return otp;
  } catch (error) {
    await OtpModel.deleteOne({ _id: otpRecord._id });
    throw error;
  }
};

module.exports = sendEmail;
