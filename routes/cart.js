const express = require("express");

const router = express.Router();

let currentCart = null;

router.post("/", (req, res) => {
  currentCart = req.body;

  console.log("===== CART RECEIVED =====");
  console.log(JSON.stringify(currentCart, null, 2));

  res.json({
    success: true
  });
});

router.get("/", (req, res) => {
  console.log("===== CART REQUESTED =====");
  console.log(JSON.stringify(currentCart, null, 2));

  res.json(
    currentCart || {
      items: [],
      total_price: 0
    }
  );
});

module.exports = router;
