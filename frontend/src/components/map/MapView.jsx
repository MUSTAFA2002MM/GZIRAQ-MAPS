import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useEffect, useRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

const defaultPosition = [33.3152, 44.3661];

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildPopupHtml(place, { canEdit, canDelete }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  const phoneLink = place.phone
    ? `<a class="popup-action" href="tel:${escapeHtml(place.phone)}">اتصال</a>`
    : "";
  const image = place.image
    ? `<img class="popup-image" src="${escapeHtml(place.image)}" alt="" />`
    : "";

  const editButton = canEdit
    ? `<button class="popup-action" type="button" data-action="edit" data-id="${place.id}">تعديل</button>`
    : "";
  const deleteButton = canDelete
    ? `<button class="popup-action danger" type="button" data-action="delete" data-id="${place.id}">حذف</button>`
    : "";

  return `
    <div class="popup-content" dir="rtl">
      ${image}
      <h3>${escapeHtml(place.name)}</h3>
      ${
        place.category_name
          ? `<span class="popup-chip">${escapeHtml(place.category_name)}</span>`
          : ""
      }
      ${
        place.description
          ? `<p>${escapeHtml(place.description)}</p>`
          : ""
      }
      <div class="popup-actions">
        ${phoneLink}
        <a class="popup-action" href="${mapsUrl}" target="_blank" rel="noreferrer">الاتجاهات</a>
        <button class="popup-action" type="button" data-action="share" data-id="${place.id}">مشاركة</button>
        ${editButton}
        ${deleteButton}
      </div>
    </div>
  `;
}

function MapClickHandler({ onMapClick, enabled }) {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return;
      }

      onMapClick?.([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

function FlyToPosition({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) {
      return;
    }

    map.flyTo(position, Math.max(map.getZoom(), 14), {
      duration: 0.8,
    });
  }, [map, position]);

  return null;
}

function ClusterLayer({
  places,
  onDelete,
  canDelete,
  canEdit,
  onEdit,
}) {
  const map = useMap();
  const handlersRef = useRef({ onDelete, onEdit, canDelete, canEdit });

  handlersRef.current = { onDelete, onEdit, canDelete, canEdit };

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 55,
    });

    const placeMap = new Map(
      places.map((place) => [String(place.id), place])
    );

    const onPopupClick = async (event) => {
      const button = event.target.closest("[data-action]");

      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const action = button.getAttribute("data-action");
      const placeId = button.getAttribute("data-id");
      const place = placeMap.get(String(placeId));
      const handlers = handlersRef.current;

      if (action === "edit" && place) {
        map.closePopup();
        handlers.onEdit?.(place);
        return;
      }

      if (action === "delete" && placeId) {
        map.closePopup();
        handlers.onDelete?.(placeId);
        return;
      }

      if (action === "share" && place) {
        const shareUrl = `${window.location.origin}/?place=${place.id}`;

        try {
          if (navigator.share) {
            await navigator.share({
              title: place.name,
              text: place.description || place.name,
              url: shareUrl,
            });
          } else {
            await navigator.clipboard.writeText(shareUrl);
            window.alert("تم نسخ رابط المكان");
          }
        } catch (error) {
          console.error(error);
        }
      }
    };

    places.forEach((place) => {
      const latitude = Number(place.latitude);
      const longitude = Number(place.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const marker = L.marker([latitude, longitude], {
        icon: markerIcon,
      });

      marker.bindPopup(
        buildPopupHtml(place, {
          canEdit: handlersRef.current.canEdit,
          canDelete: handlersRef.current.canDelete,
        })
      );

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    map.getContainer().addEventListener("click", onPopupClick, true);

    return () => {
      map.getContainer().removeEventListener("click", onPopupClick, true);
      map.removeLayer(clusterGroup);
    };
  }, [map, places]);

  return null;
}

export default function MapView({
  places = [],
  selectedPosition = null,
  flyTo = null,
  onMapClick,
  clickToSelect = false,
  canDelete = false,
  canEdit = false,
  onDelete,
  onEdit,
  extraMarkers = [],
}) {
  return (
    <MapContainer
      center={defaultPosition}
      zoom={12}
      className="map-canvas"
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onMapClick={onMapClick} enabled={clickToSelect} />
      <FlyToPosition position={flyTo || selectedPosition} />

      <ClusterLayer
        places={places}
        canDelete={canDelete}
        canEdit={canEdit}
        onDelete={onDelete}
        onEdit={onEdit}
      />

      {selectedPosition && (
        <Marker position={selectedPosition} icon={markerIcon}>
          <Popup>
            <strong>الموقع المحدد</strong>
            <br />
            {selectedPosition[0].toFixed(6)}
            <br />
            {selectedPosition[1].toFixed(6)}
          </Popup>
        </Marker>
      )}

      {extraMarkers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.latitude, marker.longitude]}
          icon={markerIcon}
        >
          <Popup>
            <div dir="rtl">
              <strong>{marker.name}</strong>
              {marker.subtitle && <p>{marker.subtitle}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
