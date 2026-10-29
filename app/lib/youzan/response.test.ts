import { describe, expect, it } from "vitest";

import { YouzanApiError, resolveTokenExpiry, unwrapYouzanResponse } from "./response";

describe("unwrapYouzanResponse", () => {
  it("returns data from the current gateway shape", () => {
    expect(unwrapYouzanResponse({ success: true, code: 200, data: { a: 1 } })).toEqual({ a: 1 });
  });

  it("returns data from the legacy response shape", () => {
    expect(unwrapYouzanResponse({ response: { a: 1 } })).toEqual({ a: 1 });
  });

  it("throws with the error code for failures", () => {
    for (const body of [
      { success: false, code: 4203, message: "access_token 无效" },
      { error_response: { code: 4202, msg: "token expired" } },
      { code: 50000, gw_err_resp: { err_code: 4201, err_msg: "bad token" } },
    ]) {
      expect(() => unwrapYouzanResponse(body)).toThrow(YouzanApiError);
    }
    try {
      unwrapYouzanResponse({ success: false, code: 4203, message: "x" });
    } catch (error) {
      expect(error instanceof YouzanApiError && error.code).toBe(4203);
    }
  });
});

describe("resolveTokenExpiry", () => {
  const now = 1_800_000_000_000;
  it("handles ms epoch, s epoch and durations", () => {
    expect(resolveTokenExpiry(now + 1000, now)).toBe(now + 1000);
    expect(resolveTokenExpiry(1_800_000_100, now)).toBe(1_800_000_100_000);
    expect(resolveTokenExpiry(7200, now)).toBe(now + 7_200_000);
    expect(resolveTokenExpiry(undefined, now)).toBe(now + 3_600_000);
  });
});
