
const Group = require("../models/groupData");
const GroupMember = require("../models/groupMemberData");
const GroupMessage = require("../models/groupMessageData");
const User = require("../models/loginData"); 
const Invite = require("../models/inviteData");

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
            const groupMembers = await GroupMember.findAll({
                where: { user_id },
                attributes: ['group_id'],
            });

            const groupIds = groupMembers.map(member => member.group_id);
            const groups = await Group.findAll({
                where: { id: groupIds }, 
            });

            res.json(groups);
        } catch (error) {
            console.error("Error retrieving groups:", error);
            res.status(500).json("Error retrieving groups");
        }
    },

    getGroupMembers: async (req, res) => {
        const { group_id } = req.params;
        try {
            const members = await GroupMember.findAll({ where: { group_id } });
            res.json(members);
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
                where: {group_id },
                include: [
                    { model: User, attributes: ["name"] }, 
                ],
            });
            const formattedMessages = messages.map(message => ({
                groupId: message.group_id,
                message: message.message,
                userId: message.user_id,
                name: message.User.name,
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
            return res.status(400).json({ error: "Invalid request" });
        }
            const newMessage = await GroupMessage.create({ group_id: groupId, user_id: userId, message });
            res.status(201).json({ message_id: newMessage.id, user_id: newMessage.user_id, message: newMessage.message, created_at: newMessage.created_at });
        } catch (error) {
            console.error("Error sending group message:", error);
            res.status(500).json({ error: "Error sending group message" });
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
                return res.status(400).json("User  is already a member of this group");
            }
            const existingInvite = await Invite.findOne({ where: { group_id, user_id, status: "pending" } });
            if (existingInvite) {
            return res.status(400).json("User   already has a pending invite");
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
                return res.status(404).json("User  is not a member of this group");
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

            await GroupMember.destroy({ where: { group_id, user_id } });
            res.json({ group_id, user_id });
        } catch (error) {
            console.error("Error removing user from group:", error);
            res.status(500).json("Error removing user from group");
        }
    },

    acceptInvite: async (req, res) => {
        const { invite_id } = req.params;
        const { id } = req.body; 
    
        try {
            const invite = await Invite.findOne({ where: { id: invite_id, status: "pending" } });
            if (!invite) {
                return res.status(404).json("Invite not found or already processed");
            }
            await GroupMember.create({ group_id: invite.group_id, user_id: invite.user_id });
    
            await Invite.update({ status: "accepted" }, { where: { id: invite_id } });
            res.status(200).json("Invite accepted. You are now a member of the group.");
        } catch (error) {
            console.error("Error accepting invite:", error);
            res.status(500).json("Error accepting invite");
        }
    },
    
    rejectInvite: async (req, res) => {
        const { invite_id } = req.params;
        const { id } = req.body; 
    
        try {
            const invite = await Invite.findOne({ where: { id: invite_id, status: "pending" } });
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
            });
            const invitesWithGroupDetails = await Promise.all(invites.map(async (invite) => {
                const group = await Group.findOne({ where: { id: invite.group_id } });
                if (group) {
                    return { ...invite.toJSON(), group: group.toJSON() };
                } else {
                    console.error("Group not found for invite:", invite);
                    return { ...invite.toJSON(), group: null };
                }
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
                return res.status(404).json("User  is not a member of this group");
            }
    

            await GroupMember.update({ isAdmin: true }, { where: { group_id: group_id, user_id: user_id } });
            res.status(200).json("User  is now an admin");
        } catch (error) {
            console.error("Error making user an admin:", error);
            res.status(500).json("Error making user an admin");
        }
    },

    removeAdmin: async (req, res) => {
        const { group_id, user_id } = req.params; 
        const admin_id = req.user.userId; 
    
        try {
            // Check if the current user is the creator or an admin
            const groupMember = await GroupMember.findOne({
                where: { group_id: group_id, user_id: admin_id, isAdmin: true }
            });
            if (!groupMember) {
                return res.status(403).json("You are not authorized to perform this action");
            }
    
            // Check if the user is an admin of the group
            const member = await GroupMember.findOne({ where: { group_id: group_id, user_id: user_id, isAdmin: true } });
            if (!member) {
                return res.status(404).json("User  is not an admin of this group");
            }
    
            // Update the member's admin status
            await GroupMember.update({ isAdmin: false }, { where: { group_id: group_id, user_id: user_id } });
            res.status(200).json("User  is no longer an admin");
        } catch (error) {
            console.error("Error removing user's admin status:", error);
            res.status(500).json("Error removing user's admin status");
        }
    },
    socketJoinGroup: async (io, socketId, groupId) => {
        io.sockets.sockets.get(socketId).join(groupId);
        console.log(`User    joined group ${groupId}`);
    },

    socketSendMessage: async (io, socketId, data) => {
        const { groupId, message, userId } = data;
        try {
            const newMessage = await GroupMessage.create({ group_id: groupId, user_id: userId, message });
            const user = await User.findOne({ where: { id: userId } }); // Fetch the user to get the username
            const username = user ? user.name : 'Unknown User'; // Handle the case where username is undefined
            console.log(`Emitting newMessage to group ${groupId} with data`, { groupId, message: newMessage.message, userId: newMessage.user_id, name: username });
            io.to(groupId).emit('newMessage', { groupId, message: newMessage.message, userId: newMessage.user_id, name: username });
            console.log(`New message sent to group ${groupId}:`, newMessage);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    },

    socketGroupUpdate: (io, socketId, groupId) => {
        io.to(socketId).emit('groupUpdate', { groupId });
    },
};

module.exports = groupControl;
