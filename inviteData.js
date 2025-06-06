const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./loginData"); 
const Group = require("./groupData");
const GroupMember = require("./groupmemberData");

const Invite = sequelize.define("Invite", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM("pending", "accepted", "rejected"),
        defaultValue: "pending",
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
    },
}, {
    tableName: "invites",
    timestamps: false,
});

(async () => {
    try {
        await Invite.sync({ force: false });
    } catch (error) {
        console.error("Error synchronizing the GroupMember model:", error);
    }
})();
module.exports = Invite;