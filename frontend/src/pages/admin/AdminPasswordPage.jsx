import { useEffect, useState } from "react";
import PasswordInput from "../../components/common/PasswordInput";
import { useAuth } from "../../hooks/useAuth";
import { opsApi } from "../../services/opsStore";

function compressImageFile(file, maxSize = 420, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("اختر ملف صورة صالح"));
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("حجم الصورة أكبر من 8MB"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("تعذر تحميل الصورة"));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminPasswordPage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState({ name: "", avatar: "" });
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    opsApi.getAdminProfile().then((data) => {
      if (!active) return;
      setProfile({
        name: data.name || "",
        avatar: data.avatar || "",
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const onPasswordChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const onAvatarPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const avatar = await compressImageFile(file);
      setProfile((current) => ({ ...current, avatar }));
      setProfileMessage("تم تجهيز الصورة — اضغط حفظ الملف الشخصي");
    } catch (error) {
      setProfileMessage(error.message || "تعذر رفع الصورة");
    }
  };

  const clearAvatar = () => {
    setProfile((current) => ({ ...current, avatar: "" }));
    setProfileMessage("سيتم إزالة الصورة عند الحفظ");
  };

  const onSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");

    const result = await opsApi.updateAdminProfile(profile);
    setSavingProfile(false);

    if (!result.ok) {
      setProfileMessage(result.data.message || "تعذر حفظ الملف الشخصي");
      return;
    }

    const saved = result.data.profile || profile;
    setProfile(saved);
    updateUser?.({
      name: saved.name,
      avatar: saved.avatar || "",
    });
    setProfileMessage(result.data.message || "تم حفظ الملف الشخصي");
  };

  const onSubmitPassword = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordMessage("");

    const result = await opsApi.changeAdminPassword(form);
    setSavingPassword(false);

    if (!result.ok) {
      setPasswordMessage(result.data.message || "تعذر تغيير كلمة المرور");
      return;
    }

    setForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordMessage(result.data.message || "تم تغيير كلمة مرور المدير");
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>الملف الشخصي للمدير</h2>
          <p>أضف صورة واسمًا يظهران في لوحة التحكم، ويمكن تغيير كلمة السر من نفس الصفحة</p>
        </div>
      </header>

      {profileMessage && (
        <div
          className={`message ${
            profileMessage.includes("تعذر") || profileMessage.includes("أكبر")
              ? "error"
              : "success"
          }`}
        >
          {profileMessage}
        </div>
      )}

      <form className="panel-form" onSubmit={onSaveProfile}>
        <div className="admin-profile-card">
          <div className="admin-avatar-preview">
            {profile.avatar ? (
              <img src={profile.avatar} alt="صورة المدير" />
            ) : (
              <span>G</span>
            )}
          </div>
          <div className="admin-profile-fields">
            <label className="input-group">
              <span>اسم المدير</span>
              <input
                value={profile.name}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="input-group">
              <span>صورة الملف الشخصي</span>
              <input
                type="file"
                accept="image/*"
                onChange={onAvatarPick}
              />
            </label>
            <div className="form-buttons">
              <button
                className="primary-button"
                type="submit"
                disabled={savingProfile}
              >
                {savingProfile ? "جارٍ الحفظ..." : "حفظ الملف الشخصي"}
              </button>
              {profile.avatar ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={clearAvatar}
                >
                  إزالة الصورة
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </form>

      <header className="panel-header" style={{ marginTop: 28 }}>
        <div>
          <h2>كلمة سر المدير</h2>
          <p>غيّر كلمة المرور هنا. الحقول مخفية ولن تظهر كلمة السر على الشاشة</p>
        </div>
      </header>

      {passwordMessage && (
        <div
          className={`message ${
            passwordMessage.includes("تم") ? "success" : "error"
          }`}
        >
          {passwordMessage}
        </div>
      )}

      <form className="panel-form" onSubmit={onSubmitPassword}>
        <div className="form-grid">
          <PasswordInput
            name="currentPassword"
            label="كلمة المرور الحالية"
            value={form.currentPassword}
            onChange={onPasswordChange}
            required
            autoComplete="current-password"
          />
          <PasswordInput
            name="newPassword"
            label="كلمة المرور الجديدة"
            value={form.newPassword}
            onChange={onPasswordChange}
            minLength={6}
            required
            autoComplete="new-password"
          />
          <PasswordInput
            name="confirmPassword"
            label="تأكيد كلمة المرور الجديدة"
            value={form.confirmPassword}
            onChange={onPasswordChange}
            minLength={6}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="form-buttons">
          <button
            className="primary-button"
            type="submit"
            disabled={savingPassword}
          >
            {savingPassword ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
          </button>
        </div>
      </form>
    </section>
  );
}
