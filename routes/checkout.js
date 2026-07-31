router.post("/", (req, res) => {

    console.log(req.body);

    currentCart = JSON.parse(req.body.cart);

    console.log(currentCart);

    res.json({
        success: true
    });

});
