const db = require('../models');
const Invite = db.Invite;
const GroupMember = db.GroupMember;
const Group = db.Group;
const User = db.User;
const sequelize = db.sequelize;

exports.sendInviteToUser = async (req, res) => {
    try {
        const { group_id } = req.params; 
        const { user_id } = req.body;
        const senderId = req.user.userId; 

        const groupMember = await GroupMember.findOne({
            where: { group_id: group_id, user_id: senderId, isAdmin: true }
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
};

exports.getPendingInvites = async (req, res) => {
    try {
        const user_id = req.user.userId; 

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
};

exports.acceptInvite = async (req, res) => {
    const { invite_id } = req.params;
    const userId = req.user.userId;
    const { groupId } = req.body; 

    let transaction; 
    try {
        transaction = await sequelize.transaction(); 

        const invite = await Invite.findOne({
            where: {
                id: invite_id,
                user_id: userId,
                group_id: groupId, 
                status: "pending"
            },
            transaction 
        });

        if (!invite) {
            await transaction.rollback(); 
            return res.status(404).json("Invite not found, not for you, or already processed.");
        }

        const existingMember = await GroupMember.findOne({
            where: { group_id: groupId, user_id: userId },
            transaction 
        });

        if (existingMember) {
            await Invite.update({ status: "accepted" }, { where: { id: invite_id }, transaction }); 
            await transaction.commit(); 
            return res.status(200).json("You are already a member of this group. Invite marked as accepted.");
        }

        await GroupMember.create({
            group_id: invite.group_id,
            user_id: invite.user_id,
            isAdmin: false
        }, { transaction }); 

        await Invite.update({ status: "accepted" }, { where: { id: invite_id }, transaction }); // Pass transaction

        await transaction.commit();
        res.status(200).json("Invite accepted. You are now a member of the group.");
    } catch (error) {
        if (transaction) {
            await transaction.rollback(); 
        }
        console.error("Error accepting invite:", error);
        res.status(500).json("Error accepting invite");
    }
};

exports.rejectInvite = async (req, res) => {
    const { invite_id } = req.params;
    const userId = req.user.userId;
    const { groupId } = req.body; 

    let transaction; 
    try {
        transaction = await sequelize.transaction(); 

        const invite = await Invite.findOne({
            where: {
                id: invite_id,
                user_id: userId,
                group_id: groupId, 
                status: "pending"
            },
            transaction 
        });

        if (!invite) {
            await transaction.rollback(); 
            return res.status(404).json("Invite not found or already processed");
        }

        await Invite.update({ status: "rejected" }, { where: { id: invite_id }, transaction }); 

        await transaction.commit(); 
        res.status(200).json("Invite rejected.");
    } catch (error) {
        if (transaction) {
            await transaction.rollback(); 
        }
        console.error("Error rejecting invite:", error);
        res.status(500).json("Error rejecting invite");
    }
};
