const express = require("express");
const router = express.Router();
const Schema = require("../Schema/userData");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
require("dotenv").config();
const UserOTPVerification = require("../Schema/UserOTPVerification");

let transporter = nodemailer.createTransport({
  service: "gmail",
  //   host: "smtp-mail.outlook.com",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Ready for messages");
    console.log(success);
  }
});

const sendOTPVerificationEmail = async ({ username, email }, res) => {
  try {
    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;

    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify Your Email",
      html: `<p>Enter <b>${otp}</b> in the app to verify your email address and complete the Signup</p><p>This code <b>expires in 1 hour</b>.</p>`,
    };

    const saltRounds = 10;
    bcrypt.hash(otp, saltRounds);
    const hashedOTP = await bcrypt.hash(otp, saltRounds);
    const newOTPVerification = new UserOTPVerification({
      username: username,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    await newOTPVerification.save();
    await transporter.sendMail(mailOptions);
    res.json({
      status: "PENDING",
      message: "Verification OTP email sent",
      data: {
        username: username,
        email,
      },
    });
  } catch (error) {
    res.json({
      status: "FAILED",
      message: error.message,
    });
  }
};

router.post("/forgotPassword", async (req, res, next) => {
  const { username, email, password } = req.body;
  sendOTPVerificationEmail({ username, email }, res);
});

router.post("/create", async (req, res, next) => {
  const { name, username, email, password } = req.body;

  // Check for existing user or email if needed
  const existingUser = await Schema.findOne({ username: username });
  const existingEmail = await Schema.findOne({ email: email });

  if (existingUser || existingEmail) {
    return res.status(400).json("User or email already exists.");
  }
  const bcrypt = require("bcrypt");
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  try {
    const newUser = new Schema({
      name,
      username,
      email,
      password: hashedPassword,
      verified: false,
    });

    await newUser.save();
    sendOTPVerificationEmail({ username, email }, res);
  } catch (error) {
    next(error);
  }
});

const afterVerification = async ({ username, email }, res) => {
  try {
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Sign Up Successfull!!",
      html: `<p>Account has been created successfully</p><p>Thank you for joining with us !!</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.json({
      status: "Success",
      message: "Account created successfully",
      data: {
        username: username,
        email,
      },
    });
  } catch (error) {
    res.json({
      status: "FAILED",
      message: error.message,
    });
  }
};

router.post("/verifyOTP", async (req, res) => {
  try {
    let { username, otp, email } = req.body;
    if (!username || !otp) {
      throw Error("Empty otp details are not allowed");
    } else {
      const UserOTPVerificationRecords = await UserOTPVerification.find({
        username,
      });
      if (UserOTPVerification.length <= 0) {
        throw new Error(
          "Account record doesn't exists or has been verified already. Please sign up or log in"
        );
      } else {
        const { expiresAt } = UserOTPVerificationRecords[0];
        const hashedOTP = UserOTPVerificationRecords[0].otp;
        if (expiresAt < Date.now()) {
          await UserOTPVerification.deleteMany({ username });
          throw new Error("Code has expired. Please request again.");
        } else {
          const validOTP = await bcrypt.compare(otp, hashedOTP);

          if (!validOTP) {
            throw new Error("Invalid code passed. Check your inbox.");
          } else {
            afterVerification({ username, email }, res);
            await Schema.updateOne({ username: username }, { verified: true });
            await UserOTPVerification.deleteMany({ username });
          }
        }
      }
    }
  } catch (error) {
    res.status(400).json(error.message);
  }
});

router.post("/verifyOTPforPassword", async (req, res) => {
  try {
    let { username, otp, email, password } = req.body;
    if (!username || !otp) {
      throw Error("Empty otp details are not allowed");
    } else {
      const UserOTPVerificationRecords = await UserOTPVerification.find({
        username,
      });
      if (UserOTPVerification.length <= 0) {
        throw new Error(
          "Account record doesn't exists or has been verified already. Please sign up or log in"
        );
      } else {
        const { expiresAt } = UserOTPVerificationRecords[0];
        const hashedOTP = UserOTPVerificationRecords[0].otp;
        if (expiresAt < Date.now()) {
          await UserOTPVerification.deleteMany({ username });
          throw new Error("Code has expired. Please request again.");
        } else {
          const validOTP = await bcrypt.compare(otp, hashedOTP);

          if (!validOTP) {
            throw new Error("Invalid code passed. Check your inbox.");
          } else {
            afterPasswordVerification({ username, email }, res);
            const bcrypt = require("bcrypt");
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            await Schema.updateOne(
              { username: username },
              { password: hashedPassword }
            );
            await UserOTPVerification.deleteMany({ username });
          }
        }
      }
    }
  } catch (error) {
    res.status(400).json(error.message);
  }
});

const afterPasswordVerification = async ({ username, email }, res) => {
  try {
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Password Updated!!",
      html: `<p>Password has been updated successfully</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.json({
      status: "Success",
      message: "Password Updated successfully",
      data: {
        username: username,
        email,
      },
    });
  } catch (error) {
    res.json({
      status: "FAILED",
      message: error.message,
    });
  }
};

router.post("/resendOTPPasswordVerificationCode", async (req, res) => {
  try {
    let { username, email, password } = req.body;

    if (!username || !email) {
      throw Error("Empty user details are not allowed");
    } else {
      await UserOTPVerification.deleteMany({ username });
      sendOTPVerificationEmail({ username: username, email }, res);
    }
  } catch (error) {
    res.json({
      status: "Failed",
      message: error.message,
    });
  }
});

router.post("/resendOTPVerificationCode", async (req, res) => {
  try {
    let { username, email } = req.body;

    if (!username || !email) {
      throw Error("Empty user details are not allowed");
    } else {
      await UserOTPVerification.deleteMany({ username });
      sendOTPVerificationEmail({ username: username, email }, res);
    }
  } catch (error) {
    res.json({
      status: "Failed",
      message: error.message,
    });
  }
});
module.exports = router;
