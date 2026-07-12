import { useEffect, useState } from "react";
import { api } from "../services/api";

export function usePlaces(filters = {}, options = {}) {
  const { publicOnly = true, enabled = true } = options;
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPlaces = async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      let result = publicOnly
        ? await api.getPublicPlaces(filters)
        : await api.getPlaces(filters);

      if (!result.ok && publicOnly && result.status === 401) {
        result = { ok: true, data: { places: [] } };
      }

      if (!result.ok) {
        setError(result.data.message || "تعذر جلب الأماكن");
        return;
      }

      let nextPlaces = result.data.places || [];

      if (filters.search) {
        const query = filters.search.toLowerCase();
        nextPlaces = nextPlaces.filter((place) => {
          const name = String(place.name || "").toLowerCase();
          const description = String(place.description || "").toLowerCase();
          return name.includes(query) || description.includes(query);
        });
      }

      if (filters.category_id) {
        nextPlaces = nextPlaces.filter(
          (place) =>
            String(place.category_id) === String(filters.category_id)
        );
      }

      setPlaces(nextPlaces);
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaces();
  }, [
    enabled,
    publicOnly,
    filters.search,
    filters.category_id,
  ]);

  return {
    places,
    loading,
    error,
    reload: loadPlaces,
    setPlaces,
  };
}
