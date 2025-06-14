// models/index.js
const Sequelize = require('sequelize');
const sequelize = require('../config/db'); // Your Sequelize instance
const { Op } = Sequelize; // This specific line is needed here

// Import your models
const User = require('./loginData');
const Group = require('./groupData');
const GroupMember = require('./groupmemberData');
const GroupMessage = require('./groupmessageData');
const Invite = require('./inviteData');
const Message = require('./messageData'); // Your private message model

// --- NEW IMPORTS FOR ARCHIVE MODELS ---
const ArchivedGroupMessage = require('./archivedGroupMessage'); // Added for archiving
const ArchivedMessage = require('./archivedMessage');       // Added for archiving
// --- END NEW IMPORTS ---

// Define associations
// User and Group (through GroupMember) - Many-to-Many
// Explicitly define 'as' aliases for clarity in queries
User.belongsToMany(Group, { through: GroupMember, foreignKey: 'user_id', as: 'Groups' });
Group.belongsToMany(User, { through: GroupMember, foreignKey: 'group_id', as: 'Users' });

// GroupMember (Join Table) explicit associations - important for direct GroupMember queries
GroupMember.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(GroupMember, { foreignKey: 'user_id' });
GroupMember.belongsTo(Group, { foreignKey: 'group_id' });
Group.hasMany(GroupMember, { foreignKey: 'group_id' });

Group.belongsTo(User, { as: 'Creator', foreignKey: 'creator_id' });
User.hasMany(Group, { as: 'CreatedGroups', foreignKey: 'creator_id' });

GroupMessage.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(GroupMessage, { foreignKey: 'user_id' });

GroupMessage.belongsTo(Group, { foreignKey: 'group_id' });
Group.hasMany(GroupMessage, { foreignKey: 'group_id' });

Invite.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Invite, { foreignKey: 'user_id' });

Invite.belongsTo(Group, { foreignKey: 'group_id' });
Group.hasMany(Invite, { foreignKey: 'group_id' });

Message.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Message, { foreignKey: 'userId' });

module.exports = {
    sequelize,
    User,
    Group,
    GroupMessage,
    GroupMember,
    Invite,
    Message,
    Op,
    ArchivedGroupMessage, 
    ArchivedMessage,      
};
