const mongoose = require("mongoose");
const express = require("express");
const FL = require("./routes/userDataRoutes");
const SL = require("./routes/signUpVerification");
const cors = require("cors");
const UserOTPVerification = require("./Schema/UserOTPVerification");

const app = express();

mongoose.set("strictQuery", true);
mongoose.connect(
  "mongodb+srv://chethannv:chethan@chethan.kjdlxwb.mongodb.net/VibeConnect"
);
const db = mongoose.connection;
db.on("open", () => {
  console.log("Database Connected");
});
db.on("error", () => {
  console.log("Database not Connected");
});

app.use(express.json());
app.use(cors());
app.use("/User-Data", SL);
app.use("/User-Data", FL);

const port = 5500;
app.listen(port, () => {
  console.log("Server Started on " + port);
});
