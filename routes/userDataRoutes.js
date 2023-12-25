const express = require("express");
const router = express.Router();
const Schema = require("../Schema/userData");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
require("dotenv").config();
const UserOTPVerification = require("../Schema/UserOTPVerification");

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await Schema.findOne({ username: username });

    if (user) {
      // Compare the hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        res.json("Login successful");
      } else if (password === "") {
        return res.status(400).json("Enter password");
      } else {
        return res.status(400).json("Username or Password incorrect");
      }
    } else if (username === "" && password === "") {
      return res.status(400).json("Enter username and password");
    } else if (username === "") {
      return res.status(400).json("Enter username");
    } else {
      return res.status(400).json("No Record Exist");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json("Internal Server Error");
  }
});

router.post("/data", (req, res) => {
  const { username } = req.body;
  Schema.findOne({ username: username }).then((login) => {
    if (login) {
      return res.json(login);
    } else {
      return res.status(400).json("No record exits");
    }
  });
});

router.delete("/delete", async (req, res) => {
  try {
    const { username } = req.body;
    console.log(username);

    // Find the user with the provided username and delete it
    const deletedUser = await Schema.findOneAndDelete({
      username: username,
    });
    if (deletedUser) {
      res
        .status(200)
        .json({ message: "User deleted successfully", deletedUser });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

router.post("/update", async (req, res) => {
  try {
    const { username, name, email, password } = req.body;
    const bcrypt = require("bcrypt");
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    // Check if a user with the provided username exists in the database
    const existingUser = await Schema.findOne({ username });

    if (existingUser) {
      // Update the existing user's information
      existingUser.name = name;
      existingUser.password = hashedPassword;
      await existingUser.save();

      res.status(200).json({ message: "User data updated successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(400).json({ message: "Failed to save/update user data" });
  }
});

module.exports = router;
