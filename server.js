require('dotenv').config(); 

const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const db = require('./models'); 

const app = express();

app.use(cors({
    origin:"*" 
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*', 
        methods: ["GET", "POST"]
    }
});

exports.io = io; 

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, "public"))); 


const userRoutes = require('./routes/userRoute'); 
const messageRoutes = require("./routes/messageRoutes");
const groupRoutes = require("./routes/groupRoute");
const inviteRoutes = require("./routes/inviteRoutes");


app.use("/api", userRoutes);
app.use("/api", messageRoutes);
app.use("/api", groupRoutes);
app.use("/api/invites", inviteRoutes); 


const groupControl = require('./controllers/groupController');

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('joinGroup', (groupId) => {
        groupControl.socketJoinGroup(io, socket.id, groupId); 
    });

    socket.on('sendMessage', async (data) => {
        console.log('Client sent message via socket (text only):', data);
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


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html")); 
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html")); 
});

app.get("/group", (req, res) => { 
    res.sendFile(path.join(__dirname, "views", "group.html"));
});

app.get("/home", (req, res) => { 
    res.sendFile(path.join(__dirname, "views", "home.html"));
});


const PORT = process.env.PORT || 5500;


db.sequelize.sync({ force: false }) 
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error("Error synchronizing database:", err);
    });
