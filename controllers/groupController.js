const db = require('../models'); 
const { io } = require('../server'); 
const { Op } = require('sequelize');

const { s3Client } = require('../middleware/uploadMiddleware'); 
const { GetObjectCommand } = require('@aws-sdk/client-s3'); 
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner'); 

const Group = db.Group;
const User = db.User;
const GroupMessage = db.GroupMessage;
const GroupMember = db.GroupMember;
const Invite = db.Invite;

const groupControl = {
    createGroup: async (req, res) => {
        const { name } = req.body;
        const creator_id = req.user.userId; 
        try {
            const newGroup = await Group.create({ name, creator_id });
            await GroupMember.create({
                group_id: newGroup.id,
                user_id: creator_id,
                isAdmin: true,
            });
            res.status(201).json({ group_id: newGroup.id, name: newGroup.name, creator_id });
        } catch (error) {
            console.error("Error creating group:", error);
            res.status(500).json("Error creating group");
        }
    },
    getGroups: async (req, res) => {
        const user_id = req.user.userId; 
        try {
            const groupMemberships = await GroupMember.findAll({
                where: { user_id: user_id },
                include: [{
                    model: Group, 
                    attributes: ['id', 'name', 'creator_id', 'created_at']
                }]
            });

            const userGroups = groupMemberships
                .filter(membership => membership.Group !== null) 
                .map(membership => ({
                    id: membership.Group.id,
                    name: membership.Group.name,
                    creator_id: membership.Group.creator_id,
                    created_at: membership.Group.created_at 
                }));
            
            res.json(userGroups);
        } catch (error) {
            console.error("Error retrieving groups:", error);
            res.status(500).json("Error retrieving groups");
        }
    },


    getGroupDetails: async (req, res) => {
        const { group_id } = req.params;
        const user_id = req.user.userId;
        try {
            const isMember = await GroupMember.findOne({ where: { group_id, user_id } });
            if (!isMember) {
                return res.status(403).json("You are not a member of this group");
            }
            const group = await Group.findOne({ where: { id: group_id } });
            if (!group) {
                return res.status(404).json({ error: "Group not found" });
            }
            res.json(group);
        } catch (error) {
            console.error("Error fetching group details:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    getGroupMembers: async (req, res) => {
        const { group_id } = req.params;
        try {
            const members = await GroupMember.findAll({ 
                where: { group_id },
                include: [{ model: User, attributes: ['id', 'name'] }] // Include user details
            });
            const formattedMembers = members.map(member => ({
                id: member.User.id,        
                user_id: member.user_id,   
                name: member.User ? member.User.name : 'Unknown User', 
                isAdmin: member.isAdmin    
            }));
            res.json(formattedMembers);
        } catch (error) {
            console.error("Error retrieving group members:", error);
            res.status(500).json("Error retrieving group members");
        }
    },

    joinGroup: async (req, res) => {
        const { group_id } = req.params;
        const user_id = req.user.userId;
        try {
            const newMember = await GroupMember.create({
                group_id,
                user_id,
                isAdmin: false,
            });
            res.status(201).json({ group_id, user_id, joined_at: newMember.joined_at });
        } catch (error) {
            console.error("Error joining group:", error);
            res.status(500).json("Error joining group");
        }
    },

    leaveGroup: async (req, res) => {
        const { group_id } = req.params;
        const user_id = req.user.userId;
        try {
            const group = await Group.findByPk(group_id);
            if (group && group.creator_id === user_id) {
                return res.status(403).json("Group creator cannot leave the group. Please delete the group instead if you wish to remove it.");
            }

            const isMember = await GroupMember.findOne({ where: { group_id, user_id } });
            if (!isMember) {
                return res.status(404).json("You are not a member of this group");
            }

            await GroupMember.destroy({ where: { group_id, user_id } });
            res.status(200).json("You have left the group successfully.");
        } catch (error) {
            console.error("Error leaving group:", error);
            res.status(500).json("Error leaving group");
        }
    },

    getGroupMessages: async (req, res) => {
        const { group_id } = req.params;
        const user_id = req.user.userId;
        try {
            const isMember = await GroupMember.findOne({ where: { group_id, user_id } });
            if (!isMember) {
                return res.status(403).json("You are not a member of this group");
            }

            const messages = await GroupMessage.findAll({
                where: { group_id },
                include: [
                    { model: User, attributes: ["name"] },
                ],
                order: [['created_at', 'ASC']]
            });

            const formattedMessages = messages.map(message => ({
                id: message.id, 
                groupId: message.group_id,
                message: message.message,
                fileUrl: message.fileUrl, 
                fileType: message.fileType, 
                userId: message.user_id,
                name: message.User ? message.User.name : 'Unknown User',
                created_at: message.created_at,
                isCurrent: message.user_id === user_id 
            }));
            res.json(formattedMessages);
        } catch (error) {
            console.error("Error retrieving group messages:", error);
            res.status(500).json("Error retrieving group messages");
        }
    },

    sendGroupMessage: async (req, res) => {
        try {
            const groupId = req.params.group_id;
            const userId = req.user.userId;
            const message = req.body.message;
            if (!groupId || !userId || !message) {
                return res.status(400).json({ error: "Invalid request: Missing groupId, userId, or message" });
            }
            const newMessage = await GroupMessage.create({ group_id: groupId, user_id: userId, message });
            res.status(201).json({ message_id: newMessage.id, user_id: newMessage.user_id, message: newMessage.message, created_at: newMessage.created_at });
        } catch (error) {
            console.error("Error sending group message:", error);
            res.status(500).json({ error: "Error sending group message" });
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const users = await User.findAll({ attributes: ['id', 'name'] });
            res.json(users);
        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json("Error fetching users");
        }
    },

    inviteUserToGroup: async (req, res) => {
        const { group_id } = req.params;
        const { user_id } = req.body;
        const admin_id = req.user.userId;

        try {
            const groupMember = await GroupMember.findOne({
                where: { group_id: group_id, user_id: admin_id, isAdmin: true }
            });
            if (!groupMember) {
                return res.status(403).json("You are not authorized to perform this action");
            }

            const isMember = await GroupMember.findOne({ where: { group_id, user_id } });
            if (isMember) {
                return res.status(400).json("User is already a member of this group");
            }
            const existingInvite = await Invite.findOne({ where: { group_id, user_id, status: "pending" } });
            if (existingInvite) {
                return res.status(400).json("User already has a pending invite");
            }

            await Invite.create({ group_id, user_id, status: "pending" });
            res.status(201).json("Invite sent successfully");
        } catch (error) {
            console.error("Error inviting user to group:", error);
            res.status(500).json("Error inviting user to group");
        }
    },

    checkAdminStatus: async (req, res) => {
        const { group_id } = req.params;
        const user_id = req.user.userId;
        try {
            const member = await GroupMember.findOne({
                where: { group_id, user_id },
            });
            if (!member) {
                return res.status(404).json("User is not a member of this group");
            }
            res.json({ isAdmin: member.isAdmin });
        } catch (error) {
            console.error("Error checking admin status:", error);
            res.status(500).json("Error checking admin status");
        }
    },

    removeUserFromGroup: async (req, res) => {
        const { group_id } = req.params;
        const { user_id } = req.body;
        const admin_id = req.user.userId;

        try {
            const groupMember = await GroupMember.findOne({
                where: { group_id: group_id, user_id: admin_id, isAdmin: true }
            });
            if (!groupMember) {
                return res.status(403).json("You are not authorized to perform this action");
            }

            const group = await Group.findByPk(group_id);
            if (group && group.creator_id === user_id) {
                return res.status(403).json("Cannot remove the group creator.");
            }

            const result = await GroupMember.destroy({ where: { group_id, user_id } });
            if (result === 0) {
                return res.status(404).json("User not found in this group.");
            }
            res.json("User removed successfully");
        } catch (error) {
            console.error("Error removing user from group:", error);
            res.status(500).json("Error removing user from group");
        }
    },

    acceptInvite: async (req, res) => {
        const { invite_id } = req.params;
        const userId = req.user.userId; 
        const groupId = req.params.group_id; 

        try {
            const invite = await Invite.findOne({ where: { id: invite_id, user_id: userId, group_id: groupId, status: "pending" } });
            if (!invite) {
                return res.status(404).json("Invite not found or already processed");
            }
            const existingMember = await GroupMember.findOne({ where: { group_id: groupId, user_id: userId } });
            if (existingMember) {
                await Invite.update({ status: "accepted" }, { where: { id: invite_id } }); // Mark invite as accepted even if already member
                return res.status(200).json("You are already a member of this group. Invite marked as accepted.");
            }

            await GroupMember.create({ group_id: invite.group_id, user_id: invite.user_id, isAdmin: false });

            await Invite.update({ status: "accepted" }, { where: { id: invite_id } });
            res.status(200).json("Invite accepted. You are now a member of the group.");
        } catch (error) {
            console.error("Error accepting invite:", error);
            res.status(500).json("Error accepting invite");
        }
    },

    rejectInvite: async (req, res) => {
        const { invite_id } = req.params;
        const userId = req.user.userId; 
        const groupId = req.params.group_id; 

        try {
            const invite = await Invite.findOne({ where: { id: invite_id, user_id: userId, group_id: groupId, status: "pending" } });
            if (!invite) {
                return res.status(404).json("Invite not found or already processed");
            }

            await Invite.update({ status: "rejected" }, { where: { id: invite_id } });
            res.status(200).json("Invite rejected.");
        } catch (error) {
            console.error("Error rejecting invite:", error);
            res.status(500).json("Error rejecting invite");
        }
    },

    getPendingInvites: async (req, res) => {
        const user_id = req.user.userId;
        try {
            const invites = await Invite.findAll({
                where: { user_id, status: "pending" },
                include: [{ model: Group, attributes: ['id', 'name', 'creator_id'] }] 
            });
            const invitesWithGroupDetails = invites.map(invite => ({
                id: invite.id,
                groupId: invite.group_id,
                userId: invite.user_id,
                status: invite.status,
                createdAt: invite.created_at,
                group: invite.Group ? { id: invite.Group.id, name: invite.Group.name } : null 
            }));
            res.json(invitesWithGroupDetails);
        } catch (error) {
            console.error("Error fetching pending invites:", error);
            res.status(500).json("Error fetching pending invites");
        }
    },

    makeAdmin: async (req, res) => {
        const { group_id, user_id } = req.params;
        const admin_id = req.user.userId;

        try {
            const groupMember = await GroupMember.findOne({
                where: { group_id: group_id, user_id: admin_id, isAdmin: true }
            });
            if (!groupMember) {
                return res.status(403).json("You are not authorized to perform this action");
            }

            const member = await GroupMember.findOne({ where: { group_id: group_id, user_id: user_id } });
            if (!member) {
                return res.status(404).json("User is not a member of this group");
            }

            await GroupMember.update({ isAdmin: true }, { where: { group_id: group_id, user_id: user_id } });
            res.status(200).json("User is now an admin");
        } catch (error) {
            console.error("Error making user an admin:", error);
            res.status(500).json("Error making user an admin");
        }
    },

    removeAdmin: async (req, res) => {
        const { group_id, user_id } = req.params;
        const admin_id = req.user.userId;

        try {
            const groupMember = await GroupMember.findOne({
                where: { group_id: group_id, user_id: admin_id, isAdmin: true }
            });
            if (!groupMember) {
                return res.status(403).json("You are not authorized to perform this action");
            }

            const group = await Group.findByPk(group_id);
            if (group && group.creator_id === parseInt(user_id) && group.creator_id === admin_id) {
                return res.status(403).json("Cannot remove admin status from the group creator.");
            }

            const member = await GroupMember.findOne({ where: { group_id: group_id, user_id: user_id, isAdmin: true } });
            if (!member) {
                return res.status(404).json("User is not an admin of this group or not found");
            }

            await GroupMember.update({ isAdmin: false }, { where: { group_id: group_id, user_id: user_id } });
            res.status(200).json("User is no longer an admin");
        } catch (error) {
            console.error("Error removing user's admin status:", error);
            res.status(500).json("Error removing user's admin status");
        }
    },

    getSignedUrlForFile: async (req, res) => {
        const { group_id, fileKey } = req.params; 
        const user_id = req.user.userId; 

        try {
            const isMember = await GroupMember.findOne({ where: { group_id, user_id } });
            if (!isMember) {
                return res.status(403).json({ error: "Access Denied: You are not a member of this group." });
            }

            
            const message = await GroupMessage.findOne({
                where: {
                    group_id: group_id,
                    fileUrl: { [Op.like]: `%/${fileKey}` } 
                }
            });

            if (!message) {
                return res.status(404).json({ error: "File not found in this group or invalid file key." });
            }

            const command = new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: fileKey, 
            });

            const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

            res.json({ fileUrl: signedUrl }); 
        } catch (error) {
            console.error("Error generating pre-signed URL:", error);
            res.status(500).json({ error: "Internal server error generating file URL." });
        }
    },

    uploadFile: async (req, res) => {
        try {
            const groupId = req.params.groupId;
            const userId = req.user.userId; 
            const file = req.file; 

            if (!file) {
                return res.status(400).json({ message: 'No file uploaded.' });
            }
            if (!groupId) {
                return res.status(400).json({ message: 'Group ID is required.' });
            }

            const isMember = await GroupMember.findOne({ where: { group_id: groupId, user_id: userId } });
            if (!isMember) {
                return res.status(403).json({ message: 'You are not a member of this group.' });
            }

            const newMessage = await GroupMessage.create({
                message: req.body.message || null, 
                fileUrl: file.location, 
                fileType: file.mimetype, 
                user_id: userId, 
                group_id: groupId 
            });

            const user = await User.findByPk(userId);

            
            io.to(`group-${groupId}`).emit('newMessage', { 
                id: newMessage.id,
                message: newMessage.message,
                fileUrl: newMessage.fileUrl,
                fileType: newMessage.fileType,
                userId: newMessage.user_id, 
                groupId: newMessage.group_id, 
                name: user ? user.name : 'Unknown User', 
                created_at: newMessage.created_at
            });

            res.status(200).json({ message: 'File uploaded and message sent successfully!', fileUrl: file.location });
        } catch (error) {
            console.error("Error uploading file:", error);
            res.status(500).json({ message: 'Failed to upload file.', error: error.message });
        }
    },

    socketJoinGroup: async (io, socketId, groupId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            socket.join(`group-${groupId}`); 
            console.log(`User ${socketId} joined group group-${groupId}`); 
        } else {
            console.error(`Socket with ID ${socketId} not found.`);
        }
    },

    socketSendMessage: async (io, socketId, data) => {
        const { groupId, message, userId } = data;
        try {
            const newMessage = await GroupMessage.create({ group_id: groupId, user_id: userId, message });
            const user = await User.findOne({ where: { id: userId } }); 
            const username = user ? user.name : 'Unknown User'; 
            console.log(`Emitting newMessage to group group-${groupId} with data`, { groupId, message: newMessage.message, userId: newMessage.user_id, name: username });
            io.to(`group-${groupId}`).emit('newMessage', { 
                id: newMessage.id,
                groupId, 
                message: newMessage.message, 
                userId: newMessage.user_id, 
                name: username,
                created_at: newMessage.created_at
            });
            console.log(`New message sent to group ${groupId}:`, newMessage);
        } catch (error) {
            console.error("Error sending message:", error);

        }
    },

    socketGroupUpdate: (io, socketId, groupId) => {
        io.to(`group-${groupId}`).emit('groupUpdate', { groupId }); 
    },
};

module.exports = groupControl;
