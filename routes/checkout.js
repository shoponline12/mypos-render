const express = require("express");

const router = express.Router();

let currentCart = null;

// Λαμβάνει το καλάθι από το Shopify
router.post("/", (req, res) => {
  currentCart = req.body;
  res.json({ success: true });
});

// Εμφανίζει τη σελίδα checkout
router.get("/", (req, res) => {
  res.render("checkout", {
    cart: currentCart
  });
});

// Επιστρέφει το τελευταίο καλάθι
router.get("/cart", (req, res) => {
  res.json(
    currentCart || {
      items: [],
      total_price: 0
    }
  );
});

module.exports = router;
