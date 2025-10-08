// server.js
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const axios = require('axios')

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const url = ` https://file-synchronization.onrender.com`;
const interval = 60000;


setInterval(reloadWebsite, interval);

app.use(
  cors({
    origin: "https://file-synchronization-client.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);
app.use(express.json());

// Serve static files (index.html, downloads.html, etc.)
app.use(express.static(path.join(__dirname, "..")));

const { router: sessionRouter } = require("./routes/session");
app.use("/", sessionRouter);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
