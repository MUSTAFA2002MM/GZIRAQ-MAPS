import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { opsApi } from "../../services/opsStore";

function formatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString("ar-IQ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const seenIds = useRef(new Set());
  const primed = useRef(false);

  const load = async () => {
    const result = await opsApi.listNotifications({ unreadOnly: false });
    if (!result.ok) return;

    const list = result.data.notifications || [];
    const unread = Number(result.data.unreadCount) || 0;
    setItems(list);
    setUnreadCount(unread);

    const fresh = list.filter(
      (item) =>
        !item.read &&
        !seenIds.current.has(Number(item.id)) &&
        (item.type === "order_delivered" || item.type === "order_returned")
    );

    if (!primed.current) {
      list.forEach((item) => seenIds.current.add(Number(item.id)));
      primed.current = true;
      return;
    }

    if (fresh.length > 0) {
      const latest = fresh[0];
      seenIds.current.add(Number(latest.id));
      setToast(latest);

      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(latest.title || "إشعار جديد", {
              body: latest.body || "",
              tag: `order-${latest.order_id || latest.id}`,
            });
          } catch {
            /* ignore browser notification errors */
          }
        }
      }
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const markAllRead = async () => {
    await opsApi.markNotificationsRead({ all: true });
    await load();
  };

  const markOneRead = async (id) => {
    await opsApi.markNotificationsRead({ ids: [id] });
    await load();
  };

  return (
    <div className="admin-notify-wrap">
      {toast ? (
        <div className="admin-notify-toast" role="status">
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.body}</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              markOneRead(toast.id);
              setToast(null);
            }}
          >
            حسناً
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="admin-notify-bell"
        onClick={() => {
          setOpen((value) => !value);
          requestBrowserPermission();
        }}
        aria-label="إشعارات التسليم"
      >
        🔔
        {unreadCount > 0 ? (
          <span className="admin-notify-badge">{unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className="admin-notify-panel">
          <div className="admin-notify-head">
            <strong>إشعارات التسليم</strong>
            <button
              type="button"
              className="secondary-button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              تعليم الكل كمقروء
            </button>
          </div>

          {items.length === 0 ? (
            <p className="empty-hint">لا توجد إشعارات بعد</p>
          ) : (
            <div className="admin-notify-list">
              {items.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-notify-item ${item.read ? "" : "is-unread"}`}
                  onClick={() => markOneRead(item.id)}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    <span>{formatTime(item.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <Link className="admin-notify-link" to="/admin/orders" onClick={() => setOpen(false)}>
            فتح الطلبات
          </Link>
        </div>
      ) : null}
    </div>
  );
}
