const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("checkout", {
        cart: []
    });
});

router.post("/", (req, res) => {

    console.log("SHOPIFY CART:");
    console.log(req.body);

    res.render("checkout", {
        cart: req.body.items || []
    });

});

module.exports = router;
