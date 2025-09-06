const ClientConfig = require("../models/ClientConfig");

// GET client config for a chatbot
exports.getClientConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const config = await ClientConfig.findOne({ chatbot_id: id });

    if (!config) {
      return res
        .status(404)
        .json({ message: "Config not found for this chatbot" });
    }

    res.json({ config });
  } catch (err) {
    console.error("Get config error:", err.message);
    res.status(500).json({ message: "Error fetching client config" });
  }
};

// PUT / UPDATE client config for a chatbot
exports.updateClientConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.link_intents) {
      updateData.link_intents = updateData.link_intents.filter(
        (intent) =>
          intent.intent &&
          Array.isArray(intent.keywords) &&
          typeof intent.link === "string"
      );
    }

    const config = await ClientConfig.findOneAndUpdate(
      { chatbot_id: id },
      updateData,
      { upsert: true, new: true }
    );

    res.json({ message: "Client config saved", config });
  } catch (err) {
    console.error("Update config error:", err.message);
    res.status(500).json({ message: "Error updating client config" });
  }
};
