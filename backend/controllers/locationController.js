const locationService = require("../services/locationService");
const {
  isValidCoordinate,
  parseAccuracy,
} = require("../utils/validators");

async function saveLocation(req, res) {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const accuracy = parseAccuracy(req.body.accuracy);

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: "إحداثيات الموقع غير صحيحة",
      });
    }

    if (accuracy === undefined) {
      return res.status(400).json({
        success: false,
        message: "دقة الموقع غير صحيحة",
      });
    }

    const location = await locationService.upsertUserLocation({
      userId: req.user.id,
      latitude,
      longitude,
      accuracy,
    });

    return res.json({
      success: true,
      message: "تم حفظ موقعك بنجاح",
      location,
    });
  } catch (error) {
    console.error("Save location error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر حفظ الموقع",
    });
  }
}

async function getMyLocation(req, res) {
  try {
    const location = await locationService.getUserLocation(req.user.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "لم يتم حفظ موقع حتى الآن",
      });
    }

    return res.json({
      success: true,
      location,
    });
  } catch (error) {
    console.error("Get location error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب الموقع",
    });
  }
}

async function getLocations(req, res) {
  try {
    const locations = await locationService.getAllLocations();

    return res.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error("Get locations error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب مواقع المستخدمين",
    });
  }
}

async function getDeliveryLocations(req, res) {
  try {
    const locations = await locationService.getDeliveryLocations();

    return res.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error("Get delivery locations error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب مواقع التوصيل",
    });
  }
}

module.exports = {
  saveLocation,
  getMyLocation,
  getLocations,
  getDeliveryLocations,
};
