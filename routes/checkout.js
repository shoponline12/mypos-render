router.post("/", (req, res) => {

    const cart = JSON.parse(req.body.cart);

    res.render("checkout", {
        cart
    });

});
