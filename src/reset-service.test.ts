import assert from "node:assert/strict";
import test from "node:test";
import { requestPasswordReset } from "./reset-service.ts";

test("the reset decision sends a link only after the reset request is accepted", async () => {
  const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
  const client = { call: async <T>(path: string, body: Record<string, unknown>) => {
    calls.push({ path, body });
    return (path.includes("reset_request") ? {} : { message_id: "msg_123" }) as T;
  } };
  const result = await requestPasswordReset({ email: "founder@streambox.test", return_to: "https://streambox.test/reset" }, client);
  assert.deepEqual(result, { email: "founder@streambox.test", status: "reset_link_requested", message_id: "msg_123" });
  assert.deepEqual(calls.map((call) => call.path), ["/v1/auth/password/reset_request", "/v1/email/send"]);
  assert.equal(calls[1].body.to, "founder@streambox.test");
});
