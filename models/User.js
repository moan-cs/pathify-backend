const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// تعريف موديل User الذي يمثل جدول Users في قاعدة البيانات
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,   // نوعه رقم صحيح
    primaryKey: true,          // المفتاح الأساسي للجدول
    autoIncrement: true,       // يزيد تلقائي مع كل مستخدم جديد
  },
  name: {
    type: DataTypes.STRING,    // نوع نصي
    allowNull: false,          // مطلوب (لا يقبل القيمة الفارغة)
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,          // مطلوب
    unique: true,              // لا يسمح بتكرار الإيميل
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,          // مطلوب (سيُخزَّن بعد التشفير لاحقاً)
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user',      // افتراضياً كل مستخدم جديد يكون role = 'user'
  },
});

module.exports = User;
