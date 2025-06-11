const {Sequelize} = require('sequelize');
require('dotenv').config();

const db = new Sequelize(process.env.DB_NAME,process.env.DB_USER,process.env.DB_PWD,{
    host:process.env.MYSQL_HOST,
    dialect:"mysql",
    logging: console.log,
});
(async () => {
    try {
        await db.authenticate();
        console.log("Database connected");
        
    } catch (error) {
        console.error("Error connecting to the database:", error);
    }
})();
module.exports = db;
