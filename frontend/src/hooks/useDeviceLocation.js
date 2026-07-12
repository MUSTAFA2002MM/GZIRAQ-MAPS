import { useEffect, useState } from "react";

export function readPosition(options = {}) {
  const timeout = options.timeout ?? 12000;
  const allowInsecure = options.allowInsecure !== false;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("المتصفح لا يدعم تحديد الموقع"));
      return;
    }

    if (!window.isSecureContext && !allowInsecure) {
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
        if (!window.isSecureContext) {
          reject(
            new Error(
              "تعذر GPS على HTTP. للتتبع والتسليم بدقة استخدم متصفحًا يسمح بالموقع أو HTTPS"
            )
          );
          return;
        }
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
        maximumAge: 3000,
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
      setGeoMessage("المتصفح لا يدعم GPS");
      return undefined;
    }

    let settled = false;
    const failTimer = setTimeout(() => {
      if (!settled) {
        setGeoStatus((current) => (current === "ready" ? current : "timeout"));
        setGeoMessage(
          insecure
            ? "GPS ضعيف على HTTP — اسمح بالموقع إن ظهر الطلب، أو جرّب متصفحًا آخر"
            : "تعذر تثبيت الموقع بسرعة — اضغط إعادة محاولة GPS"
        );
      }
    }, 10000);

    if (insecure) {
      setGeoMessage("محاولة تفعيل GPS على HTTP للتتبع والتسليم...");
    }

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
          `التتبع يعمل · الدقة ≈ ${Math.round(position.coords.accuracy || 0)}م`
        );
      },
      () => {
        settled = true;
        setGeoStatus("denied");
        setGeoMessage(
          insecure
            ? "تعذر GPS على HTTP — التسليم يحتاج موقعًا حقيقيًا عند الزبون"
            : "لم يتم السماح بالموقع — فعّله لإتمام التسليم وتتبعك"
        );
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );

    return () => {
      clearTimeout(failTimer);
      navigator.geolocation.clearWatch(watchId);
    };
  }, [insecure]);

  const refreshLocation = async () => {
    const next = await readPosition({ allowInsecure: true, timeout: 15000 });
    setLocation(next);
    setGeoStatus("ready");
    setGeoMessage(`التتبع يعمل · الدقة ≈ ${Math.round(next.accuracy || 0)}م`);
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
