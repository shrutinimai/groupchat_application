require('dotenv').config();
const express = require('express');
const userRoutes = require('./routes/userRoute');
const messageRoutes = require("./routes/messageRoutes");
const groupRoutes = require("./routes/groupRoute");
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

app.use(cors({
    origin:"*"
}));

const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

app.use("/api",userRoutes);
app.use("/api",messageRoutes);
app.use("/api",groupRoutes);


const groupControl = require('./controllers/groupController');
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('joinGroup', (groupId) => {
        console.log('Client joined group', groupId);
        groupControl.socketJoinGroup(io, socket.id, groupId);
    });

    socket.on('sendMessage', async (data) => {
        console.log('Client sent message', data);
        await groupControl.socketSendMessage(io, socket.id, data);
    });

    socket.on('groupUpdate', (groupId) => {
        console.log('Client updated group', groupId);
        groupControl.socketGroupUpdate(io, socket.id, groupId);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

app.use(express.static(path.join(__dirname,"../frontend/public")));

app.get("/",(req,res) => {
    res.sendFile(path.join(__dirname,"../frontend/views/index.html")); // Corrected path
});

app.get("/login",(req,res) => {
    res.sendFile(path.join(__dirname,"../frontend/views/login.html")); // Corrected path
});

server.listen(process.env.PORT,() => {
    console.log(`Server is running on port ${process.env.PORT}`);
});