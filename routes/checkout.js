const express = require("express");

const router = express.Router();

router.post("/", (req, res) => {

    res.render("checkout", {
        cart: req.body
    });

});

module.exports = router;
