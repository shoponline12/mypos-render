require("dotenv").config();
const express = require("express");
const cors = require("cors");

const paymentRoutes = require("./routes/payment");
const notifyWebhook = require("./webhooks/notify");

const app = express();

function rawBodySaver(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
}

app.use(cors());
app.use(express.json({ verify: rawBodySaver }));
app.use(express.urlencoded({ extended: true, verify: rawBodySaver }));

app.get("/", (req, res) => {
  res.send("myPOS Server is running!");
});

app.use("/payment", paymentRoutes);
app.use("/payment", notifyWebhook);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
