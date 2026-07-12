export default function PlacePopup({
  place,
  canDelete = false,
  canEdit = false,
  onDelete,
  onEdit,
}) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  const shareUrl = `${window.location.origin}/?place=${place.id}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: place.name,
          text: place.description || place.name,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      window.alert("تم نسخ رابط المكان");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="popup-content" dir="rtl">
      {place.image && (
        <img className="popup-image" src={place.image} alt={place.name} />
      )}

      <h3>{place.name}</h3>

      {place.category_name && (
        <span className="popup-chip">{place.category_name}</span>
      )}

      {place.description && <p>{place.description}</p>}

      <div className="popup-actions">
        {place.phone && (
          <a className="popup-action" href={`tel:${place.phone}`}>
            اتصال
          </a>
        )}

        <a
          className="popup-action"
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          الاتجاهات
        </a>

        <button className="popup-action" type="button" onClick={handleShare}>
          مشاركة
        </button>

        {canEdit && (
          <button
            className="popup-action"
            type="button"
            onClick={() => onEdit?.(place)}
          >
            تعديل
          </button>
        )}

        {canDelete && (
          <button
            className="popup-action danger"
            type="button"
            onClick={() => onDelete?.(place.id)}
          >
            حذف
          </button>
        )}
      </div>
    </div>
  );
}
