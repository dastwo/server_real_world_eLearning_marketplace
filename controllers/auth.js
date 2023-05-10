const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { hashPassword, comparePassword } = require("../utils/auth");
const AWS = require("aws-sdk");
const nanoid = require("nanoid");

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
};

const SES = new AWS.SES(awsConfig);

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({
          message: "password is required and should be min 6 characters long",
        });
    }
    let userExist = await User.findOne({ email });
    if (userExist) return res.status(400).json({ message: "Email is taken" });

    const hashedPassword = await hashPassword(password);

    const user = User({
      name,
      email,
      password: hashedPassword,
    });
    await user.save();
    return res.status(200).json({ ok: true, message: "user saved" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json("User not exists");
    const checkPassword = await comparePassword(password, user.password);
    if (!checkPassword) return res.status(400).json("Password error try agin");
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    user.password = undefined;
    res.cookie("token", token, {
      httpOnly: true,
      // secure: true
    });
    res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ message: "Logout success" });
  } catch (error) {
    return res.status(400).json(error.message);
  }
};

const currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).select("-password").exec();
    
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "fix the server currentUser" });
  }
};

const sendTestEmail = async (req, res) => {
  try {
    const params = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: ["dastwo68@gmail.com"],
      },
      ReplyToAddresses: [process.env.EMAIL_FROM],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `
                <html>
                  <h1>Reset password link</h1>
                  <p>Please use the following link to reset your password</p>
                </html>
              `,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Password reset link",
        },
      },
    };

    const emailSent = await SES.sendEmail(params).promise();
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json("Try agin");
  }
};

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const shortCode = nanoid(6).toUpperCase();
    const user = await User.findOneAndUpdate(
      { email },
      { passwordResetCode: shortCode }
    );
    if (!user) return res.status(400).json("User not found");

    const params = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: [email],
      },
      ReplyToAddresses: [process.env.EMAIL_FROM],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `
              <html>
                <h1>Reset password </h1>
                <p>User this code to reset your password</p>
                <h2 style="color:red;">${shortCode}</h2>
                <i>Destaw-cudamy.com</i>
              </html>
            `,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Password reset ",
        },
      },
    };

    const emailSent = await SES.sendEmail(params).promise();
    res.json({ ok: true });
  } catch (err) {
    return res.status(400).json("error forget Password");
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, email, code } = req.body;
    const hashedPassword = await hashPassword(newPassword);

    const user = await User.findOneAndUpdate(
      { email, passwordResetCode: code },
      { password: hashedPassword }
    ).exec();
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json("error");
  }
};

module.exports = {
  register,
  login,
  logout,
  sendTestEmail,
  currentUser,
  forgetPassword,
  resetPassword,
};
