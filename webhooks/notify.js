const express = require("express");
const { verifyWebhookSignature } = require("../services/mypos");

const router = express.Router();

router.post("/notify", async (req, res) => {
  try {
    const valid = verifyWebhookSignature(req);
    if (!valid) {
      console.error("Webhook signature verification failed.");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload = req.body;
    console.log("Received myPOS PurchaseNotify:", JSON.stringify(payload));

    // TODO: update order status, persist IPC_Trnref and payment result, etc.
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed:", error.message || error);
    return res.status(500).json({ error: "Webhook processing error" });
  }
});

module.exports = router;
