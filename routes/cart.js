const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const response = await fetch("https://summer-shop.eu/cart.js");
    const cart = await response.json();

    res.json(cart);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
