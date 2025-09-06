const express = require("express");
const router = express.Router();
const { uploadContextFile } = require("../controllers/contextController");
const upload = require("../middleware/uploadMiddleware");
const { protect, restrictTo } = require("../middleware/authMiddleware"); // ✅

router.post(
  "/upload-file",
  protect,
  restrictTo("admin"),
  upload.single("file"),
  uploadContextFile
);

module.exports = router;
