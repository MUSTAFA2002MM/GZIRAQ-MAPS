import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const defaultPosition = [33.3152, 44.3661];

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function AddMarker({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

function App() {
  const [markers, setMarkers] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [placeName, setPlaceName] = useState("");

  const handleMapClick = (position) => {
    setSelectedPosition(position);
    setPlaceName("");
  };

  const saveMarker = () => {
    if (!selectedPosition) {
      return;
    }

    if (!placeName.trim()) {
      alert("اكتب اسم المكان أولًا");
      return;
    }

    const newMarker = {
      id: Date.now(),
      name: placeName.trim(),
      position: selectedPosition,
    };

    setMarkers((currentMarkers) => [...currentMarkers, newMarker]);
    setSelectedPosition(null);
    setPlaceName("");
  };

  const cancelMarker = () => {
    setSelectedPosition(null);
    setPlaceName("");
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>GZIRAQ MAPS</h1>
        <span>اضغط على الخريطة لإضافة موقع</span>
      </header>

      <MapContainer
        center={defaultPosition}
        zoom={13}
        className="map"
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AddMarker onMapClick={handleMapClick} />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={markerIcon}
          >
            <Popup>
              <strong>{marker.name}</strong>
              <br />
              {marker.position[0].toFixed(6)},{" "}
              {marker.position[1].toFixed(6)}
            </Popup>
          </Marker>
        ))}

        {selectedPosition && (
          <Marker position={selectedPosition} icon={markerIcon}>
            <Popup permanent="true">
              موقع جديد
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {selectedPosition && (
        <div className="place-form">
          <h2>إضافة موقع جديد</h2>

          <input
            type="text"
            placeholder="اكتب اسم المكان"
            value={placeName}
            onChange={(event) => setPlaceName(event.target.value)}
            autoFocus
          />

          <div className="form-buttons">
            <button className="save-button" onClick={saveMarker}>
              حفظ الموقع
            </button>

            <button className="cancel-button" onClick={cancelMarker}>
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;