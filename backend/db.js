const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
function connectdb() {
  try {
    const uri =
      process.env.mongo_uri || "mongodb://localhost:27017/FileSynchronization";
    mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 20,
    });
    console.log("db connected succesfully !");
  } catch (error) {
    console.log("db connection failed !", error);
  }
}

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  uploads: [
    {
      filename: { type: String, required: true },
      size: { type: Number, required: true },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  messages: [
    {
      text: { type: String, required: true },
      sentAt: { type: Date, default: Date.now },
    },
  ],
  status: {
    type: String,
    enum: ["waiting", "completed", "expired"],
    default: "waiting",
  },
  connection_created: {
    type: Boolean,
    default: false,
  },
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = { Session, connectdb };
