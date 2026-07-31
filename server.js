require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const paymentRoutes = require("./routes/payment");
const notifyWebhook = require("./webhooks/notify");
const checkoutRoute = require("./routes/checkout");
const cartRoute = require("./routes/cart");

const app = express();

function rawBodySaver(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(cors());
app.use(express.json({ verify: rawBodySaver }));
app.use(express.urlencoded({ extended: true, verify: rawBodySaver }));

app.get("/", (req, res) => {
  res.send("myPOS Server is running!");
});

app.use("/checkout", checkoutRoute);
app.use("/cart", cartRoute);

app.use("/payment", paymentRoutes);
app.use("/payment", notifyWebhook);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
