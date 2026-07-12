import { useEffect, useState } from "react";

export function readPosition(options = {}) {
  const timeout = options.timeout ?? 12000;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("المتصفح لا يدعم تحديد الموقع"));
      return;
    }

    if (!window.isSecureContext) {
      reject(
        new Error(
          "المتصفح يمنع GPS على HTTP. يمكنك تسجيل الحضور مباشرة بدون GPS"
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error?.code === 1) {
          reject(new Error("يجب السماح بإذن الموقع من إعدادات المتصفح"));
        } else if (error?.code === 3) {
          reject(new Error("انتهت مهلة تحديد الموقع. حاول مرة أخرى"));
        } else {
          reject(new Error("تعذر قراءة الموقع حاليًا"));
        }
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 5000,
      }
    );
  });
}

export function useDeviceLocation() {
  const [location, setLocation] = useState(null);
  const [geoStatus, setGeoStatus] = useState("loading");
  const [geoMessage, setGeoMessage] = useState("جارٍ تحديد موقعك...");
  const insecure = typeof window !== "undefined" && !window.isSecureContext;

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("unavailable");
      setGeoMessage("المتصفح لا يدعم GPS — يمكنك تسجيل الحضور مباشرة");
      return undefined;
    }

    if (insecure) {
      setGeoStatus("insecure");
      setGeoMessage(
        "GPS غير متاح على HTTP في هذا المتصفح — سجّل الحضور بالزر أدناه مباشرة"
      );
      return undefined;
    }

    let settled = false;
    const failTimer = setTimeout(() => {
      if (!settled) {
        setGeoStatus((current) => (current === "ready" ? current : "timeout"));
        setGeoMessage(
          "تعذر تثبيت الموقع بسرعة — يمكنك المحاولة أو تسجيل الحضور مباشرة"
        );
      }
    }, 8000);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        settled = true;
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGeoStatus("ready");
        setGeoMessage(
          `الموقع جاهز · الدقة ≈ ${Math.round(position.coords.accuracy || 0)}م`
        );
      },
      () => {
        settled = true;
        setGeoStatus("denied");
        setGeoMessage("لم يتم السماح بالموقع — يمكنك تسجيل الحضور مباشرة");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      clearTimeout(failTimer);
      navigator.geolocation.clearWatch(watchId);
    };
  }, [insecure]);

  const refreshLocation = async () => {
    try {
      const next = await readPosition();
      setLocation(next);
      setGeoStatus("ready");
      setGeoMessage(`الموقع جاهز · الدقة ≈ ${Math.round(next.accuracy || 0)}م`);
      return next;
    } catch (error) {
      setGeoStatus((current) =>
        current === "ready" ? current : "denied"
      );
      setGeoMessage(error.message || "تعذر تحديد الموقع");
      throw error;
    }
  };

  return {
    location,
    setLocation,
    geoStatus,
    geoMessage,
    insecure,
    canBypassGeo: insecure || geoStatus !== "ready",
    refreshLocation,
  };
}
