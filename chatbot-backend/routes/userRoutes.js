const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware.protect); // Ensure token-based auth

router.get("/company", userController.getUserCompany);
router.get("/plan", userController.getUserPlan);
router.get("/usage", userController.getUserUsage);
router.get("/messages", userController.getUserMessages);
router.get("/sessions", userController.getUserSessions);
router.get("/messages/unique-emails-and-phones", userController.getUniqueEmailsAndPhones);
router.get("/report/download", userController.downloadUserReport);
router.get("/messages/:email/pdf", userController.downloadUserChatByEmail);
router.get("/messages/download-emails-and-phone-numbers", userController.downloadEmailsAndPhoneNumbersCSV);





module.exports = router;
