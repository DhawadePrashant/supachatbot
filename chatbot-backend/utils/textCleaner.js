// utils/textCleaner.js
function cleanInputText(text) {
  if (!text) return "";
  // Remove only asterisks
  return text.replace(/\*/g, "");
}

module.exports = { cleanInputText };
