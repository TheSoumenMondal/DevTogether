import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

dotenv.config({
  path: "./.env",
});
const app = express();
const server = http.createServer(app);

const io = new Server(server);

const userSocketMap = {};
const roomCodeMap = {}; 

const getAllConnectedClients = (roomid) => {
  return Array.from(io.sockets.adapter.rooms.get(roomid) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

io.on("connection", (socket) => {
  console.log("Socket connected: " + socket.id);

  socket.on("join", ({ roomid, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomid);

    const clients = getAllConnectedClients(roomid);

    const currentCode = roomCodeMap[roomid] || '';

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit("joined", {
        clients,
        username,
        socketId: socket.id,
        currentCode,
      });
    });
  });

  socket.on("code-change", ({ roomid, code }) => {
    roomCodeMap[roomid] = code;

    socket.to(roomid).emit("code-change", code);
  });

  socket.on("reconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomid) => {
      socket.in(roomid).emit("refreshing", {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomid) => {
      socket.in(roomid).emit("disconnected", {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
