const { Op } = require("sequelize"); 
const User = require('../models/loginData'); 
const Message = require("../models/messageData");

const messageControl = {
    getMessages: async (req, res) => {
        const lastId = req.query.lastId ? parseInt(req.query.lastId) : -1; // Parse lastId

        try {
            const messages = await Message.findAll({
                where: {
                    id: {
                        [Op.gt]: lastId 
                    }
                },
                include: [{ model: User, attributes: ['name'] }]
            });
            
            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                message: msg.message,
                name: msg.User ? msg.User.name : 'Unknown',
                isCurrent:msg.userId === req.user.userId,
                userId: msg.userId,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt,
            }));
            
            return res.json(formattedMessages); 
        } catch (error) {
            console.error("Error retrieving messages:", error);
            return res.status(500).send('Error retrieving messages');
        }
    },
    postMessage: async (req, res) => {
        const { message } = req.body;
        try {
            const newMessage = await Message.create({
                userId: req.user.userId,
                message
            });
            return res.json(newMessage);
        } catch (error) {
            console.error("Error saving message:", error.message);
            return res.status(500).send('Error saving message');
        }
    }
}

module.exports = messageControl;