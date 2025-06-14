const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db"); 


const ArchivedGroupMessage = sequelize.define("ArchivedGroupMessage", {
    
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fileType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW 
    },
    archived_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: "archived_group_messages", 
    timestamps: false 
});

module.exports = ArchivedGroupMessage;
