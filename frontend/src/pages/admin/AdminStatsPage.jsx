import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";

export default function AdminStatsPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const result = await api.getStats();

      if (!result.ok) {
        setError(result.data.message || "تعذر جلب الإحصائيات");
        return;
      }

      setStats(result.data.stats);
    }

    load();
  }, []);

  const cards = stats
    ? [
        { label: "المستخدمون", value: stats.total_users },
        { label: "الموظفون", value: stats.employees },
        { label: "حسابات التوصيل", value: stats.delivery_accounts },
        { label: "المفعّلون", value: stats.active_users },
        { label: "الأماكن", value: stats.places },
        { label: "التصنيفات", value: stats.categories },
      ]
    : [];

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>لوحة الإحصائيات</h2>
          <p>
            متابعة أداء منصة GZIRAQ MAPS من مكان واحد: المستخدمون، الأماكن،
            والتصنيفات.
          </p>
        </div>
        <Link className="primary-button" to="/admin/places">
          إدارة الأماكن
        </Link>
      </header>

      {error && <div className="message error">{error}</div>}

      <div className="stats-grid">
        {cards.map((card, index) => (
          <article
            key={card.label}
            className="stat-card"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <span>{card.label}</span>
            <strong>{card.value ?? 0}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
