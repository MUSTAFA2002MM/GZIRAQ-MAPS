import { useEffect, useMemo, useState } from "react";
import { opsApi } from "../../services/opsStore";

function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString("ar-IQ", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString("ar-IQ");
  } catch {
    return value;
  }
}

function currentMonthValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function buildMonthOptions(count = 12) {
  const options = [];
  const now = new Date();

  for (let index = 0; index < count; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = currentMonthValue(date);
    const label = date.toLocaleDateString("ar-IQ", {
      month: "long",
      year: "numeric",
    });
    options.push({ value, label });
  }

  return options;
}

function roleLabel(type) {
  if (type === "delivery") return "مندوب";
  if (type === "employee") return "موظف";
  return type || "—";
}

function statusLabel(row) {
  if (row.check_in && !row.check_out) return "متواجد";
  if (row.check_in && row.check_out) return "انصرف";
  return "لم يسجل";
}

export default function AdminAttendancePage() {
  const [rangeMode, setRangeMode] = useState("month");
  const [month, setMonth] = useState(currentMonthValue());
  const [day, setDay] = useState("today");
  const [personType, setPersonType] = useState("all");
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const monthOptions = useMemo(() => buildMonthOptions(12), []);

  const load = async () => {
    setMessage("");
    const result =
      rangeMode === "month"
        ? await opsApi.getAttendance({ month })
        : await opsApi.getAttendance({ day });

    if (!result.ok) {
      setMessage(result.data.message || "تعذر تحميل الحضور");
      setRows([]);
      return;
    }

    setRows(result.data.attendance || []);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [rangeMode, month, day]);

  const filtered = useMemo(() => {
    let list = [...rows];

    if (personType !== "all") {
      list = list.filter((row) => row.person_type === personType);
    }

    return list;
  }, [rows, personType]);

  const summary = useMemo(() => {
    const today = new Date();
    const todayKeyValue = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const present = filtered.filter(
      (row) => row.day === todayKeyValue && row.check_in && !row.check_out
    ).length;
    const checkedInDays = filtered.filter((row) => row.check_in).length;
    const agents = filtered.filter((row) => row.person_type === "delivery").length;
    const employees = filtered.filter((row) => row.person_type === "employee").length;

    return {
      present,
      checkedInDays,
      agents,
      employees,
      total: filtered.length,
    };
  }, [filtered]);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>قائمة الحضور</h2>
          <p>سجلات شهر كامل للموظفين والمندوبين مع وقت الدخول والانصراف</p>
        </div>
        <div className="topbar-actions">
          <select
            value={rangeMode}
            onChange={(event) => setRangeMode(event.target.value)}
          >
            <option value="month">شهر كامل</option>
            <option value="day">يوم محدد</option>
          </select>

          {rangeMode === "month" ? (
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <select value={day} onChange={(event) => setDay(event.target.value)}>
              <option value="today">اليوم</option>
              <option value="yesterday">أمس</option>
            </select>
          )}

          <select
            value={personType}
            onChange={(event) => setPersonType(event.target.value)}
          >
            <option value="all">الكل</option>
            <option value="delivery">المندوبون</option>
            <option value="employee">الموظفون</option>
          </select>
          <button className="secondary-button" type="button" onClick={load}>
            تحديث
          </button>
        </div>
      </header>

      {message && <div className="message error">{message}</div>}

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <article className="stat-card">
          <span>سجلات الفترة</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="stat-card">
          <span>حالات دخول</span>
          <strong>{summary.checkedInDays}</strong>
        </article>
        <article className="stat-card">
          <span>متواجد اليوم</span>
          <strong>{summary.present}</strong>
        </article>
        <article className="stat-card">
          <span>مندوبون / موظفون</span>
          <strong>
            {summary.agents} / {summary.employees}
          </strong>
        </article>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>النوع</th>
              <th>اليوم</th>
              <th>وقت الدخول</th>
              <th>وقت الخروج</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-hint">
                  لا توجد سجلات حضور لهذه الفترة
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={`${row.id}-${row.day}-${row.person_type}`}>
                  <td>{row.person_name || "—"}</td>
                  <td>{roleLabel(row.person_type)}</td>
                  <td>{formatDate(row.day)}</td>
                  <td dir="ltr">{formatTime(row.check_in)}</td>
                  <td dir="ltr">{formatTime(row.check_out)}</td>
                  <td>
                    <span
                      className={`role-badge ${
                        row.check_in && !row.check_out ? "active" : ""
                      }`}
                    >
                      {statusLabel(row)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
