const express = require("express");

const router = express.Router();

let currentCart = null;

router.post("/", (req, res) => {

    currentCart = JSON.parse(req.body.cart);

    res.json({
        success: true
    });

});

router.get("/", (req, res) => {

    res.render("checkout", {
        cart: currentCart || {
            items: [],
            total_price: 0
        }
    });

});

module.exports = router;
