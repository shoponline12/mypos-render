const express = require("express");
const { createPayment, getConfig } = require("../services/mypos");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Payment API is working"
  });
});

router.post("/create-payment", async (req, res) => {
  try {
    const paymentData = req.body;
    const result = await createPayment(paymentData);

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Create payment failed:", error.message || error);

    return res.status(500).json({
      error: error.message || "Create payment failed"
    });
  }
});

router.get("/success", (req, res) => {
  try {
    const config = getConfig();

    if (config.successUrl && config.successUrl.startsWith("http")) {
      return res.redirect(config.successUrl);
    }

    return res.json({
      status: "success",
      message: "Payment completed successfully."
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to resolve success endpoint."
    });
  }
});

router.get("/cancel", (req, res) => {
  try {
    const config = getConfig();

    if (config.cancelUrl && config.cancelUrl.startsWith("http")) {
      return res.redirect(config.cancelUrl);
    }

    return res.json({
      status: "cancelled",
      message: "Payment was cancelled."
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to resolve cancel endpoint."
    });
  }
});

module.exports = router;