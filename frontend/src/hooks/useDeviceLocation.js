import { useEffect, useRef, useState } from "react";

function positionFromEvent(position) {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    updatedAt: Date.now(),
  };
}

export function readPosition(options = {}) {
  const timeout = options.timeout ?? 12000;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("المتصفح لا يدعم تحديد الموقع"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(positionFromEvent(position)),
      (error) => {
        if (!window.isSecureContext) {
          reject(
            new Error(
              "المتصفح يمنع GPS على HTTP. افتح الموقع عبر HTTPS ثم اسمح بالموقع"
            )
          );
          return;
        }
        if (error?.code === 1) {
          reject(new Error("يجب السماح بإذن الموقع من إعدادات المتصفح"));
        } else if (error?.code === 3) {
          reject(new Error("انتهت مهلة تحديد الموقع. سيتم إعادة المحاولة تلقائيًا"));
        } else {
          reject(new Error("تعذر قراءة الموقع حاليًا"));
        }
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 2000,
      }
    );
  });
}

export function useDeviceLocation({ auto = true, intervalMs = 5000 } = {}) {
  const [location, setLocation] = useState(null);
  const [geoStatus, setGeoStatus] = useState("loading");
  const [geoMessage, setGeoMessage] = useState("جارٍ التحديث التلقائي للموقع...");
  const insecure = typeof window !== "undefined" && !window.isSecureContext;
  const locationRef = useRef(null);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!auto) return undefined;

    if (!navigator.geolocation) {
      setGeoStatus("unavailable");
      setGeoMessage("المتصفح لا يدعم GPS");
      return undefined;
    }

    let alive = true;

    const applySuccess = (next) => {
      if (!alive) return;
      setLocation(next);
      setGeoStatus("ready");
      setGeoMessage(
        `تحديث تلقائي يعمل · الدقة ≈ ${Math.round(next.accuracy || 0)}م`
      );
    };

    const applyError = (message) => {
      if (!alive) return;
      setGeoStatus((current) => (current === "ready" ? current : "denied"));
      if (!locationRef.current) {
        setGeoMessage(message);
      }
    };

    if (insecure) {
      setGeoMessage(
        "الموقع على HTTP — GPS غالبًا ممنوع. افتح عبر HTTPS لتفعيل التحديث التلقائي"
      );
    }

    const poll = async () => {
      try {
        const next = await readPosition({ timeout: 10000 });
        applySuccess(next);
      } catch (error) {
        applyError(error.message || "تعذر تحديث الموقع");
      }
    };

    poll();
    const timer = setInterval(poll, intervalMs);

    const watchId = navigator.geolocation.watchPosition(
      (position) => applySuccess(positionFromEvent(position)),
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );

    return () => {
      alive = false;
      clearInterval(timer);
      navigator.geolocation.clearWatch(watchId);
    };
  }, [auto, intervalMs, insecure]);

  const refreshLocation = async () => {
    const next = await readPosition({ timeout: 15000 });
    setLocation(next);
    setGeoStatus("ready");
    setGeoMessage(
      `تحديث تلقائي يعمل · الدقة ≈ ${Math.round(next.accuracy || 0)}م`
    );
    return next;
  };

  return {
    location,
    setLocation,
    geoStatus,
    geoMessage,
    insecure,
    canBypassGeo: geoStatus !== "ready",
    refreshLocation,
  };
}
