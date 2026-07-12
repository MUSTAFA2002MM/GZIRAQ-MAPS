const authService = require("../services/authService");

async function register(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "أدخل الاسم والبريد الإلكتروني وكلمة مرور من 6 أحرف على الأقل",
      });
    }

    const result = await authService.registerUser({
      name,
      email,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "حدث خطأ أثناء إنشاء الحساب",
    });
  }
}

async function login(req, res) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "أدخل البريد الإلكتروني وكلمة المرور",
      });
    }

    const result = await authService.loginUser({
      email,
      password,
    });

    return res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "حدث خطأ أثناء تسجيل الدخول",
    });
  }
}

async function me(req, res) {
  try {
    const user = await authService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب بيانات المستخدم",
    });
  }
}

module.exports = {
  register,
  login,
  me,
};
