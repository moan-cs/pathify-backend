const { Sequelize } = require('sequelize');
require('dotenv').config();

// إنشاء اتصال Sequelize بقاعدة البيانات MySQL
const sequelize = new Sequelize(
  process.env.DB_NAME,   // اسم قاعدة البيانات (مثلاً: pathify_db)
  process.env.DB_USER,   // اسم المستخدم في MySQL
  process.env.DB_PASS,   // كلمة مرور MySQL
  {
    host: process.env.DB_HOST, // غالباً localhost
    dialect: 'mysql',          // نستخدم MySQL
    logging: false,            // إيقاف لوق الأوامر SQL في التيرمنل
  }
);

module.exports = sequelize;
