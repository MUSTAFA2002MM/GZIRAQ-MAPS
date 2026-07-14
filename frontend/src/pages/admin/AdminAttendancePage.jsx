import { useEffect, useMemo, useState } from "react";
import { opsApi } from "../../services/opsStore";

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

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
    return new Date(`${value}T12:00:00`).toLocaleDateString("ar-IQ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatMonthLabel(value) {
  if (!value) return "—";
  try {
    const [year, month] = String(value).split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
      "ar-IQ",
      {
        year: "numeric",
        month: "long",
      }
    );
  } catch {
    return value;
  }
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
  const [personType, setPersonType] = useState("all");
  const [mode, setMode] = useState("day"); // day | month
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    setMessage("");

    const params =
      mode === "month"
        ? { month: selectedMonth }
        : { day: selectedDay };

    const result = await opsApi.getAttendance(params);

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
  }, [mode, selectedDay, selectedMonth]);

  const filtered = useMemo(() => {
    let list = [...rows];

    if (personType !== "all") {
      list = list.filter((row) => row.person_type === personType);
    }

    return list;
  }, [rows, personType]);

  const summary = useMemo(() => {
    const present = filtered.filter(
      (row) => row.check_in && !row.check_out
    ).length;
    const checkedInDays = filtered.filter((row) => row.check_in).length;
    const agents = filtered.filter((row) => row.person_type === "delivery")
      .length;
    const employees = filtered.filter((row) => row.person_type === "employee")
      .length;

    return {
      present,
      checkedInDays,
      agents,
      employees,
      total: filtered.length,
    };
  }, [filtered]);

  const jumpToday = () => {
    setMode("day");
    setSelectedDay(todayKey());
  };

  const jumpThisMonth = () => {
    setMode("month");
    setSelectedMonth(monthKey());
  };

  const onDayChange = (value) => {
    setSelectedDay(value);
    if (value) {
      setSelectedMonth(String(value).slice(0, 7));
    }
    setMode("day");
  };

  const onMonthChange = (value) => {
    setSelectedMonth(value);
    setMode("month");
    if (value) {
      // Keep day within selected month when switching later.
      const dayPart = selectedDay.slice(8);
      setSelectedDay(`${value}-${dayPart || "01"}`);
    }
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>قائمة الحضور</h2>
          <p>اختر يومًا أو شهرًا من التقويم لعرض سجلات الدخول والانصراف</p>
        </div>
        <div className="topbar-actions">
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

      <div className="attendance-calendar-bar">
        <div className="attendance-mode-tabs">
          <button
            type="button"
            className={mode === "day" ? "is-active" : ""}
            onClick={() => setMode("day")}
          >
            حسب اليوم
          </button>
          <button
            type="button"
            className={mode === "month" ? "is-active" : ""}
            onClick={() => setMode("month")}
          >
            حسب الشهر
          </button>
        </div>

        <div className="attendance-calendar-fields">
          <label className="input-group">
            <span>اليوم</span>
            <input
              type="date"
              value={selectedDay}
              onChange={(event) => onDayChange(event.target.value)}
              dir="ltr"
            />
          </label>

          <label className="input-group">
            <span>الشهر</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
              dir="ltr"
            />
          </label>
        </div>

        <div className="attendance-calendar-actions">
          <button className="secondary-button" type="button" onClick={jumpToday}>
            اليوم
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={jumpThisMonth}
          >
            هذا الشهر
          </button>
        </div>

        <p className="attendance-calendar-hint">
          العرض الحالي:{" "}
          <strong>
            {mode === "day"
              ? formatDate(selectedDay)
              : formatMonthLabel(selectedMonth)}
          </strong>
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <article className="stat-card">
          <span>{mode === "day" ? "سجلات اليوم" : "سجلات الشهر"}</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="stat-card">
          <span>حالات دخول</span>
          <strong>{summary.checkedInDays}</strong>
        </article>
        <article className="stat-card">
          <span>{mode === "day" ? "متواجد الآن" : "ما زالوا متواجدين"}</span>
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
                  لا توجد سجلات حضور للتاريخ المحدد
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
