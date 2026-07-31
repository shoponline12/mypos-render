const express = require("express");

const router = express.Router();

let currentCart = null;

router.post("/", (req, res) => {
  currentCart = req.body;
  res.json({ success: true });
});

router.get("/", (req, res) => {
  res.render("checkout", {
    cart: currentCart
  });
});

module.exports = router;
