/**
 * cleanverseClient.js — Cleanverse Cooperate API wrapper (sandbox/production).
 */

const crypto = require("crypto");

const ENV_URL =
  process.env.CLEANVERSE_ENV === "production"
    ? "https://api.cleanverse.com/api/cooperate"
    : "https://uatapi.cleanverse.com/api/cooperate";

const API_ID = process.env.CLEANVERSE_API_ID;
const API_KEY_B64 = process.env.CLEANVERSE_API_KEY;

const ENCRYPTED_ENDPOINTS = new Set([
  "/generate_apass",
  "/update_status",
  "/atoken/register_atoken",
  "/atoken/launch",
  "/atoken/register_wrapped_atoken",
  "/atoken/launch_wrapped_atoken",
  "/atoken/add_rule",
  "/atoken/remove_rule",
  "/atoken/set_paused",
  "/atoken/add_whitelist_for_institutional",
  "/atoken/remove_whitelist_for_institutional",
  "/atoken/restore_whitelist_for_institutional",
  "/blacklist/add",
  "/validator/grant",
  "/validator/register",
  "/validator/set_rule",
  "/validator/add_rule",
  "/validator/remove_rule",
  "/validator/set_paused",
]);

function aesAlgoForKey(key) {
  if (key.length === 16) return "aes-128-cbc";
  if (key.length === 24) return "aes-192-cbc";
  if (key.length === 32) return "aes-256-cbc";
  throw new Error(`Unexpected Cleanverse api-key length after Base64 decode: ${key.length} bytes`);
}

function encryptBody(plainObj) {
  const key = Buffer.from(API_KEY_B64, "base64");
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv(aesAlgoForKey(key), key, iv);
  const jsonStr = JSON.stringify(plainObj);
  const encrypted = Buffer.concat([cipher.update(jsonStr, "utf8"), cipher.final()]);
  return { data: encrypted.toString("base64") };
}

function decryptBody(base64Cipher) {
  const key = Buffer.from(API_KEY_B64, "base64");
  const iv = Buffer.alloc(16, 0);
  const decipher = crypto.createDecipheriv(aesAlgoForKey(key), key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(base64Cipher, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

async function callCleanverse(path, body, requestId) {
  if (!API_ID) throw new Error("CLEANVERSE_API_ID is not set");

  const isEncrypted = ENCRYPTED_ENDPOINTS.has(path);
  const payload = isEncrypted ? encryptBody(body) : body;

  const headers = {
    "Content-Type": "application/json",
    "api-id": API_ID,
  };
  if (requestId) headers["X-Request-ID"] = requestId;

  const res = await fetch(`${ENV_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Cleanverse HTTP ${res.status} on ${path}`);
  }

  const json = await res.json();

  if (json.code !== "0000") {
    const err = new Error(`Cleanverse ${path} failed: [${json.code}] ${json.message}`);
    err.code = json.code;
    err.raw = json;
    throw err;
  }

  return json.data;
}

async function queryAtokenList(chain) {
  return callCleanverse("/query_deposit_atoken_list", { chain });
}

async function verifyPayee(chain, atoken, address) {
  return callCleanverse("/verify_apass", { chain, atoken, address });
}

async function queryApass(chain, address) {
  return callCleanverse("/query_apass", { chain, address });
}

async function downloadTravelRule(txHash, chain, walletAddress) {
  return callCleanverse("/download_travel_rule", {
    txHash,
    wallet: { chain, address: walletAddress },
  });
}

module.exports = {
  callCleanverse,
  encryptBody,
  decryptBody,
  ENV_URL,
  queryAtokenList,
  verifyPayee,
  queryApass,
  downloadTravelRule,
};
