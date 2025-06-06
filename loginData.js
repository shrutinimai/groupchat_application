const {Sequelize,DataTypes} = require("sequelize");
const db = require(".config/db");


const User = db.define("User",{
    id:{
        type:DataTypes.INTEGER,
        autoIncrement:true,
        primaryKey:true
    },
    name:{
        type:DataTypes.STRING,
        allowNull:false
    },
    email:{
        type:DataTypes.STRING,
        allowNull:false
    },
    phone:{
        type:DataTypes.STRING,
        allowNull:false
    },
    password:{
        type:DataTypes.STRING,
        allowNull:false
    },
    createdAt:{
        type:DataTypes.DATE,
        allowNull:false,
        defaultValue: Sequelize.NOW 
    },
},{
    tableName:"loginData",
    timestamps:true
});
User.findByEmail = async (email) => {
    return await User.findOne({where:{email}});
}
(async () => {
    try {
        await User.sync({ force: false }); 
    } catch (error) {
        console.error("Error synchronizing the User model:", error);
    }
})();
module.exports = User;