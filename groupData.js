const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./loginData"); 

const Group = sequelize.define("Group", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    creator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User, // Assuming the users table is named 'users'
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: "groups",
    timestamps: false // Disable automatic timestamps since we are defining created_at
});


(async () => {
    try {
        await Group.sync({ force: false });
    } catch (error) {
        console.error("Error synchronizing the Group model:", error);
    }
})();

module.exports = Group;