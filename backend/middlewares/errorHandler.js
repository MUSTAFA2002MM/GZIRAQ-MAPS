function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: "المسار غير موجود",
  });
}

function errorHandler(error, req, res, next) {
  console.error("Unexpected error:", error);

  res.status(500).json({
    success: false,
    message: "حدث خطأ غير متوقع",
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
