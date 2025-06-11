const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./loginData"); // Import the User model

const Message = sequelize.define("message", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User, // Use the User model directly
            key: "id"
        }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: "messageData",
    timestamps: true
});

// Set up the association
Message.belongsTo(User, { foreignKey: 'userId' });

(async () => {
    try {
        await Message.sync({ force: false });
    } catch (error) {
        console.error("Error synchronizing the Message model:", error);
    }
})();

module.exports = Message;
