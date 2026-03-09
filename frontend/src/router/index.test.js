// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { getDeskRedirectTarget } from "./index";

describe("router home guard", () => {
  it("keeps spa users inside /at", () => {
    expect(getDeskRedirectTarget("/at", "spa", "agent@example.com", ["Agent"])).toBeNull();
  });

  it("redirects regular desk-only users to /app", () => {
    expect(getDeskRedirectTarget("/app", "desk", "manager@example.com", ["Desk User"])).toBe("/app");
  });

  it("does not redirect without authenticated user", () => {
    expect(getDeskRedirectTarget("/app", "desk", "", [])).toBeNull();
  });

  it("does not auto-redirect System Manager", () => {
    expect(getDeskRedirectTarget("/app", "desk", "manager@example.com", ["System Manager"])).toBeNull();
  });

  it("does not auto-redirect Administrator", () => {
    expect(getDeskRedirectTarget("/app", "desk", "administrator@example.com", ["Administrator"])).toBeNull();
  });

  it("does not auto-redirect when role names use different casing", () => {
    expect(getDeskRedirectTarget("/app", "desk", "administrator@example.com", ["administrator"])).toBeNull();
  });

  it("does not auto-redirect authenticated user if role data is missing", () => {
    expect(getDeskRedirectTarget("/app", "desk", "manager@example.com", [])).toBeNull();
  });

  it("does not auto-redirect when userId is administrator in lowercase", () => {
    expect(getDeskRedirectTarget("/app", "desk", "administrator", ["Desk User"])).toBeNull();
  });

  it("does not auto-redirect desk users without explicit role list and no user", () => {
    expect(getDeskRedirectTarget("/app", "desk", "", ["Desk User"])).toBeNull();
  });
});
