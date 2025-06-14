const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db"); 



const ArchivedMessage = sequelize.define("ArchivedMessage", {
  
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
   
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    },
    archived_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: "archived_messages", 
    timestamps: false 
});

module.exports = ArchivedMessage;
