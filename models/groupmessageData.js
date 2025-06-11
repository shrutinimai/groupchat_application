const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./loginData"); 
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
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: "group_messages",
    timestamps: false // Disable automatic timestamps since we are defining created_at
});

GroupMessage.belongsTo(User, { foreignKey: "user_id" });
(async () => {
    try {
        await GroupMessage.sync({ force: false });
    } catch (error) {
        console.error("Error synchronizing the GroupMessage model:", error);
    }
})();


module.exports = GroupMessage;
