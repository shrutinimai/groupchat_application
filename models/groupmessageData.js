// models/groupmessageData.js
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./loginData"); // Import the User model

const GroupMessage = sequelize.define("GroupMessage", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'groups', // Reference to the groups table
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User, // Reference to the users table
            key: 'id'
        }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true // Allow null for messages that are only files
    },
    fileUrl: { // NEW FIELD
        type: DataTypes.STRING,
        allowNull: true // Can be null if it's a text message
    },
    fileType: { // NEW FIELD
        type: DataTypes.STRING,
        allowNull: true // Can be null if it's a text message
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: "group_messages",
    timestamps: false // Disable automatic timestamps since we are defining created_at
});

// Set up the association
GroupMessage.belongsTo(User, { foreignKey: "user_id" });
// Assuming you have a Group model, you would also add:
// const Group = require("./groupData");
// GroupMessage.belongsTo(Group, { foreignKey: "group_id" }); // Consider adding this here or in index.js

(async () => {
    try {
        await GroupMessage.sync({ force: false });
        console.log("GroupMessage model synchronized.");
    } catch (error) {
        console.error("Error synchronizing the GroupMessage model:", error);
    }
})();

module.exports = GroupMessage;