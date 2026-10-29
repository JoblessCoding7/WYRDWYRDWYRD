import { describe, expect, it } from "vitest";

import { decodeYouzanMessage, md5Hex, verifyYouzanPush } from "./push";

const clientId = "client-id";
const clientSecret = "client-secret";
const msg = encodeURIComponent(JSON.stringify({ tid: "E2026", status: "WAIT_SELLER_SEND_GOODS" }));

function bodyWith(extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "E2026",
    kdt_id: 42,
    type: "trade_TradeBuyerPay",
    status: "WAIT_SELLER_SEND_GOODS",
    test: false,
    msg,
    ...extra,
  });
}

describe("verifyYouzanPush", () => {
  it("accepts the Event-Sign header scheme", () => {
    const rawBody = bodyWith();
    const result = verifyYouzanPush({
      rawBody,
      eventSign: md5Hex(clientId + rawBody + clientSecret).toUpperCase(),
      clientId,
      clientSecret,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event).toMatchObject({
        type: "trade_TradeBuyerPay",
        id: "E2026",
        kdtId: "42",
        isTest: false,
        message: { tid: "E2026", status: "WAIT_SELLER_SEND_GOODS" },
      });
    }
  });

  it("accepts the body sign scheme", () => {
    const rawBody = bodyWith({ sign: md5Hex(clientId + msg + clientSecret) });
    expect(
      verifyYouzanPush({ rawBody, eventSign: null, clientId, clientSecret }).ok,
    ).toBe(true);
  });

  it("rejects tampered bodies and wrong secrets", () => {
    const rawBody = bodyWith();
    const eventSign = md5Hex(clientId + rawBody + clientSecret);
    expect(
      verifyYouzanPush({
        rawBody: rawBody.replace("E2026", "E9999"),
        eventSign,
        clientId,
        clientSecret,
      }),
    ).toEqual({ ok: false, reason: "bad-signature" });
    expect(
      verifyYouzanPush({ rawBody, eventSign, clientId, clientSecret: "other" }).ok,
    ).toBe(false);
    expect(
      verifyYouzanPush({ rawBody, eventSign: null, clientId, clientSecret }).ok,
    ).toBe(false);
  });

  it("rejects malformed JSON", () => {
    expect(
      verifyYouzanPush({ rawBody: "{", eventSign: "x", clientId, clientSecret }),
    ).toEqual({ ok: false, reason: "malformed" });
  });
});

describe("decodeYouzanMessage", () => {
  it("decodes Java-style URL encoding", () => {
    expect(decodeYouzanMessage("%7B%22a%22%3A%22b+c%22%7D")).toEqual({ a: "b c" });
    expect(decodeYouzanMessage("plain")).toBe("plain");
  });
});
