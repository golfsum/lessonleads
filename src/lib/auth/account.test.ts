import { describe, expect, it } from "vitest";
import { isExistingUserError, isRecoverableCreateUserError, isUnconfirmedAuthError, loginErrorMessage } from "./account";

describe("auth account helpers", () => {
  it("detects unconfirmed accounts", () => {
    expect(isUnconfirmedAuthError({ code: "email_not_confirmed", message: "Email not confirmed" })).toBe(true);
  });

  it("detects an existing signup", () => {
    expect(isExistingUserError({ message: "User already registered" })).toBe(true);
  });

  it("retries workspace setup when the auth trigger fails", () => {
    expect(isRecoverableCreateUserError({ message: "Database error saving new user" })).toBe(true);
  });

  it("does not hide an unconfirmed login as a bad password", () => {
    expect(loginErrorMessage({ code: "email_not_confirmed", message: "Email not confirmed" })).toMatch(/confirm your email/i);
    expect(loginErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe("Email or password is incorrect.");
  });
});
