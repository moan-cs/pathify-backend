// 1) استيراد الباكجات الأساسية
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// استيراد الاتصال بقاعدة البيانات والموديل
const sequelize = require('./config/db');   // استيراد الاتصال بقاعدة البيانات
const User = require('./models/User');      // استيراد موديل User حتى يتم إنشاء جدول Users


// ميدل وير للتحقق من JWT (حارس التوكن)
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // نتوقع الهيدر بالشكل: "Bearer token"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
   return res
.status(401).json({ message: 'No token provided' });

  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // نخزن بيانات المستخدم في الطلب لاستخدامها لاحقًا في الراوت
    req.user = decoded;
    next(); // نسمح للطلب يكمل للراوت المحمي
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}


// 2) إنشاء تطبيق Express
const app = express();


// 3) ميدل وير عامة
app.use(cors());             // يسمح لتطبيق React أنه يتصل بالـ Backend
app.use(express.json());     // يحوّل JSON القادم من الـ Frontend إلى كائن JavaScript


// 4) قراءة البورت من ملف .env
const PORT = process.env.PORT || 5000;


// 5) رووت تجريبي للتأكد أن السيرفر شغال
app.get('/', (req, res) => {
  res.json({ message: 'Pathify API is running 🚀' });
});


// راوت محمي تجريبي لمعرفة أن التوكن يعمل
app.get('/api/protected/profile', authMiddleware, (req, res) => {
  res.json({
    message: 'Protected route accessed successfully',
    userFromToken: req.user, // يأتي من التوكن (id, role, iat, exp)
  });
});


// راوت تسجيل مستخدم جديد مع تشفير كلمة المرور
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1) توليد salt (ملح) للتشفير
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);

    // 2) تشفير كلمة المرور باستخدام salt
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3) إنشاء المستخدم في قاعدة البيانات باستخدام كلمة المرور المشفّرة
    const user = await User.create({
      name,
      email,
      password: hashedPassword,   // نحفظ الـ hash بدلاً من password
      role: role || 'user',
    });

    // 4) الرد بدون إرجاع كلمة المرور
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Error creating user',
      error: err.message,
    });
  }
});


// راوت تسجيل الدخول مع إنشاء JWT
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) نبحث عن المستخدم حسب الإيميل
    const user = await User.findOne({ where: { email } });

    // لو ما لقينا مستخدم
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 2) نقارن كلمة المرور المدخلة مع المشفّرة في الـ DB
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3) لو كل شيء تمام ننشئ JWT ونرجّعه
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token, // التوكن الذي سيستخدمه الـ Frontend للوصول للراوتات المحمية
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Error logging in',
      error: err.message,
    });
  }
});


// تعريف مسار GET على الرابط /api/admin/users
// هذا المسار يرجّع قائمة بكل المستخدمين، ومحمية بوسطية authMiddleware
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    // هنا نتأكد إن المستخدم اللي طلب المسار هو أدمن فقط
    // authMiddleware يكون حاط معلومات المستخدم داخل req.user
    if (req.user.role !== 'admin') {
      // لو الدور مو 'admin' نرجّع كود 403 معناها ممنوع الوصول
      return res.status(403).json({ message: 'Access denied' });
    }

    // استخدام موديل User لجلب كل المستخدمين من قاعدة البيانات
    // findAll ترجع مصفوفة من المستخدمين
    // attributes نحدد فيها الأعمدة اللي نبغاها فقط عشان ما نرجّع بيانات حساسة بدون داعي
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt']
    });

    // نرجّع للمستفيد (الفرونت) المصفوفة users بشكل JSON
    res.json(users);
  } catch (err) {
    // لو صار خطأ في قاعدة البيانات أو أي خطأ داخل try نطبع الخطأ في الكونسول عشان نقدر نعرفه أثناء التطوير
    console.error(err);
    // ونرجّع كود 500 يعني خطأ داخلي في السيرفر مع رسالة عامة
    res.status(500).json({ message: 'Error fetching users' });
  }
});


// 6) اختبار اتصال قاعدة البيانات
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Connected to MySQL (Sequelize)');
  })
  .catch((err) => {
    console.error('❌ Unable to connect to MySQL:', err);
  });


// 7) مزامنة الموديلات (إنشاء/تحديث الجداول تلقائياً في pathify_db)
sequelize
  .sync({ force: false })
  .then(() => {
    console.log('✅ Database tables synced successfully');
  })
  .catch((err) => {
    console.error('❌ Error syncing database:', err);
  });


  // نسيت كلمة المرور (بسيط)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    // البحث عن المستخدم
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    // تشفير كلمة المرور الجديدة
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // تحديث كلمة المرور
    await user.update({ password: hashedPassword });
    
    res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في إعادة التعيين' });
  }
});


// 8) تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
