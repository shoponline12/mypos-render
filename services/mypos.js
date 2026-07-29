const axios = require("axios");
const crypto = require("crypto");
const { URLSearchParams } = require("url");

function normalizeConfigKey(key) {
  return key.trim().replace(/\s+/g, "_").replace(/-/g, "_").toUpperCase();
}

function parseConfigValue(raw) {
  const config = {};

  if (raw && raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        Object.assign(config, parsed);
      }
    } catch (error) {
      console.error("Failed to parse MYPOS_CONFIG JSON:", error.message);
    }
  }

  raw = raw || "";
  raw
    .split(/[;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [rawKey, ...rest] = entry.split(/=(.+)/);
      const value = rest.join("=").trim();
      if (!rawKey || !value) {
        return;
      }

      const key = normalizeConfigKey(rawKey);
      config[key] = value;
    });

  const keyMap = {
    API_BASE: "apiBase",
    MYPOS_API_BASE: "apiBase",
    PRIVATE_KEY: "privateKey",
    PUBLIC_KEY: "publicKey",
    SID: "sid",
    WALLET_NUMBER: "walletNumber",
    KEY_INDEX: "keyIndex",
    REQUEST_TOKEN: "requestToken",
    ACCOUNT_SETTLEMENT: "accountSettlement",
    NOTE: "note",
    URL_OK: "urlOk",
    URL_CANCEL: "urlCancel",
    URL_NOTIFY: "urlNotify",
    SUCCESS_URL: "successUrl",
    CANCEL_URL: "cancelUrl",
    NOTIFY_URL: "notifyUrl",
    OUTPUT_FORMAT: "outputFormat",
    IPC_VERSION: "ipcVersion",
    IPC_LANGUAGE: "ipcLanguage",
  };

  const result = {};
  Object.entries(config).forEach(([key, value]) => {
    const normalizedKey = normalizeConfigKey(key);
    result[keyMap[normalizedKey] || normalizedKey] = value;
  });

  return result;
}

function getConfig() {
  const config = parseConfigValue(process.env.MYPOS_CONFIG || "");

  const resolved = {
    apiBase: (config.apiBase || process.env.MYPOS_API_BASE || "https://www.mypos.com/vmp/checkout-test").trim().replace(/\/+$/, ""),
    privateKey: config.privateKey || process.env.MYPOS_PRIVATE_KEY,
    publicKey: config.publicKey || process.env.MYPOS_PUBLIC_KEY,
    sid: config.sid || process.env.MYPOS_SID,
    walletNumber: config.walletNumber || process.env.MYPOS_WALLET_NUMBER,
    keyIndex: config.keyIndex || process.env.MYPOS_KEY_INDEX || "1",
    requestToken: config.requestToken || process.env.MYPOS_REQUEST_TOKEN || "0",
    accountSettlement: config.accountSettlement || process.env.MYPOS_ACCOUNT_SETTLEMENT,
    note: config.note || process.env.MYPOS_NOTE,
    successUrl: config.urlOk || config.successUrl || process.env.MYPOS_SUCCESS_URL || "/payment/success",
    cancelUrl: config.urlCancel || config.cancelUrl || process.env.MYPOS_CANCEL_URL || "/payment/cancel",
    notifyUrl: config.urlNotify || config.notifyUrl || process.env.MYPOS_NOTIFY_URL || "/payment/notify",
    outputFormat: config.outputFormat || process.env.MYPOS_OUTPUT_FORMAT || "JSON",
    ipcVersion: config.ipcVersion || process.env.MYPOS_IPC_VERSION || "1.4",
    ipcLanguage: config.ipcLanguage || process.env.MYPOS_IPC_LANGUAGE || "EN",
  };

  if (!resolved.sid) {
    throw new Error("MYPOS_CONFIG must include sid.");
  }

  if (!resolved.walletNumber) {
    throw new Error("MYPOS_CONFIG must include walletNumber.");
  }

  if (!resolved.privateKey) {
    throw new Error("MYPOS_PRIVATE_KEY or privateKey in MYPOS_CONFIG is required.");
  }

  return resolved;
}

function buildSessionPayload(paymentData, config) {
  const { amount, currency, orderId, description, cartItems, note } = paymentData;

  if (!amount || !currency) {
    throw new Error("createPayment requires amount and currency.");
  }

  const payload = {
    IPCmethod: "IPCPaymentSessionCreate",
    IPCVersion: config.ipcVersion,
    IPCLanguage: config.ipcLanguage,
    OrderID: orderId || `order-${Date.now()}`,
    Amount: amount,
    Currency: currency,
    SID: config.sid,
    WalletNumber: config.walletNumber,
    KeyIndex: config.keyIndex,
    RequestToken: config.requestToken,
    URL_OK: config.successUrl,
    URL_CANCEL: config.cancelUrl,
    URL_Notify: config.notifyUrl,
    OutputFormat: config.outputFormat,
  };

  if (config.accountSettlement) {
    payload.AccountSettlement = config.accountSettlement;
  }

  if (note || config.note) {
    payload.Note = note || config.note;
  }

  const items = Array.isArray(cartItems) && cartItems.length > 0
    ? cartItems
    : [
        {
          article: description || "Purchase",
          quantity: 1,
          price: amount,
          amount,
          currency,
        },
      ];

  payload.CartItems = items.length;

  items.forEach((item, index) => {
    const i = index + 1;
    payload[`Article_${i}`] = item.article;
    payload[`Quantity_${i}`] = item.quantity;
    payload[`Price_${i}`] = item.price;
    payload[`Amount_${i}`] = item.amount;
    payload[`Currency_${i}`] = item.currency;
  });

  return payload;
}

function buildSignatureInput(values) {
  const joined = values.map((value) => String(value)).join("-");
  return Buffer.from(joined, "utf8").toString("base64");
}

function signPayload(payload, privateKey) {
  const unsignedValues = Object.values(payload);
  const signatureInput = buildSignatureInput(unsignedValues);

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();

  return signer.sign(privateKey, "base64");
}

function verifySignedValues(values, signature, publicKey) {
  const signatureInput = buildSignatureInput(values);
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signatureInput);
  verifier.end();

  return verifier.verify(publicKey, signature, "base64");
}

function buildOrderedPayloadFromBody(rawBody) {
  const params = new URLSearchParams(rawBody || "");
  const ordered = [];

  for (const [key, value] of params.entries()) {
    ordered.push({ key, value });
  }

  return ordered;
}

function getWebhookSignatureData(req, config) {
  const rawBody = req.rawBody || "";
  if (!rawBody) {
    throw new Error("Unable to read raw webhook body for signature verification.");
  }

  const entries = buildOrderedPayloadFromBody(rawBody);
  const signatureEntry = entries.find((entry) => entry.key.toLowerCase() === "signature");
  if (!signatureEntry) {
    throw new Error("Missing Signature parameter in webhook payload.");
  }

  const values = entries
    .filter((entry) => entry.key.toLowerCase() !== "signature")
    .map((entry) => entry.value);

  return { values, signature: signatureEntry.value };
}

function verifyWebhookSignature(req) {
  const config = getConfig();
  if (!config.publicKey) {
    throw new Error("MYPOS_PUBLIC_KEY or publicKey in MYPOS_CONFIG is required to verify webhook notifications.");
  }

  const { values, signature } = getWebhookSignatureData(req, config);
  return verifySignedValues(values, signature, config.publicKey);
}

function verifyResponseSignature(responseData, publicKey) {
  if (!publicKey || !responseData || typeof responseData !== "object") {
    return true;
  }

  const signature = responseData.Signature || responseData.signature;
  if (!signature) {
    return true;
  }

  const values = Object.keys(responseData)
    .filter((key) => key.toLowerCase() !== "signature")
    .map((key) => responseData[key]);

  return verifySignedValues(values, signature, publicKey);
}

async function createPayment(paymentData) {
  const config = getConfig();
  const payload = buildSessionPayload(paymentData, config);
  payload.Signature = signPayload(payload, config.privateKey);

  const formBody = new URLSearchParams(payload).toString();

  try {
    const response = await axios.post(config.apiBase, formBody, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 30000,
    });

    if (response.data && config.publicKey) {
      const verified = verifyResponseSignature(response.data, config.publicKey);
      if (!verified) {
        throw new Error("Invalid response signature from myPOS.");
      }
    }

    return response.data;
  } catch (error) {
    if (error.response) {
      const details = error.response.data || error.response.statusText;
      throw new Error(`myPOS API error: ${error.response.status} ${JSON.stringify(details)}`);
    }

    throw new Error(`myPOS request failed: ${error.message}`);
  }
}

module.exports = {
  getConfig,
  createPayment,
  verifyWebhookSignature,
};
