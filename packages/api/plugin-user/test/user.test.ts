import { expect, it, vi, describe, beforeAll } from "vitest"
import bcrypt from "bcrypt"
import { getTestEmail } from "../../test-utils"
import { FullUser } from "../types"
import { decodeClientToken } from "../../jwt"
import { createServer } from "../../entry/serverEntry"

import { getServerUserConfig } from "../../config"

import { FactorUser } from ".."
import { FactorDb } from "../../plugin-db"

vi.mock("../serverEmail", async () => {
  const actual = (await vi.importActual("../serverEmail")) as Record<
    string,
    any
  >
  return {
    ...actual,
    getEmailSMTPService: vi.fn(() => {
      return { sendEmail: vi.fn() }
    }),
  }
})

let user: FullUser
let dbPlugin: undefined | FactorDb = undefined
let userPlugin: undefined | FactorUser = undefined

describe.skip("user tests", () => {
  beforeAll(async () => {
    dbPlugin = new FactorDb({ connectionUrl: process.env.POSTGRES_URL })
    userPlugin = new FactorUser({ db: dbPlugin })
    const userConfig = await getServerUserConfig({ moduleName: "@factor/site" })
    await createServer({ userConfig })
  })
  it("creates user", async () => {
    const response = await userPlugin?.queries.ManageUser.serve(
      {
        _action: "create",
        fields: { email: getTestEmail(), fullName: "test" },
      },
      undefined,
    )

    if (!response?.data) throw new Error("problem creating user")

    user = response?.data

    expect(user?.userId).toBeTruthy()
    expect(user?.fullName).toBe("test")
    expect(user?.verificationCode).toBeFalsy()
  })

  it("verifies account email", async () => {
    const response = await userPlugin?.queries.VerifyAccountEmail.serve(
      {
        email: user.email,
        verificationCode: "test",
      },
      undefined,
    )

    expect(response?.data).toBeTruthy()
    expect(response?.status).toBe("success")
    expect(response?.message).toBe("verification successful")

    user = response?.data as FullUser

    expect(user?.emailVerified).toBeTruthy()
    expect(user?.verificationCode).toBeFalsy()
  })

  it("sets password", async () => {
    const response = await userPlugin?.queries.SetPassword.serve(
      {
        email: user.email,
        verificationCode: "test",
        password: "test",
      },
      { bearer: user },
    )
    expect(response?.message).toContain("password created")
    user = response?.data as FullUser

    expect(bcrypt.compare("test", user?.hashedPassword ?? "")).toBeTruthy()
    expect(response?.token).toBeTruthy()

    const result = decodeClientToken(response?.token as string)

    expect(result?.email).toBe(user.email)
  })

  it("logs in with password", async () => {
    const response = await userPlugin?.queries.Login.serve(
      {
        email: user.email,
        password: "test",
      },
      {},
    )
    expect(response?.message).toMatchInlineSnapshot('"successfully logged in"')
    user = response?.data as FullUser

    expect(user).toBeTruthy()
  })

  it("resets password", async () => {
    if (!user.email) throw new Error("email required")
    const response = await userPlugin?.queries.ResetPassword.serve(
      {
        email: user.email,
      },
      undefined,
    )

    expect(response?.status).toBe("success")

    if (!response?.internal) throw new Error("code required")

    const response2 = await userPlugin?.queries.SetPassword.serve(
      {
        email: user.email,
        verificationCode: response?.internal,
        password: "test",
      },
      { bearer: user },
    )

    expect(response2?.status).toBe("success")
  })

  it("updates the user", async () => {
    const response = await userPlugin?.queries.ManageUser.serve(
      {
        _action: "update",
        email: user.email,
        fields: {
          fullName: "testUpdate",
          facebook: "https://www.facebook.com/apowers",
        },
      },
      { bearer: user },
    )

    expect(response?.status).toBe("success")
    expect(response?.data?.fullName).toBe("testUpdate")
    expect(response?.data?.facebook).toBe("https://www.facebook.com/apowers")
  })
})