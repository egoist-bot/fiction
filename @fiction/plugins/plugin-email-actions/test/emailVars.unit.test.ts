import { FictionAws, FictionMedia, abort, getEnvVars } from '@fiction/core'
import { createUserToken } from '@fiction/core/utils/jwt'
import { describe, expect, it } from 'vitest'
import { createTestUtils, testEnvFile } from '@fiction/core/test-utils'
import { FictionEmailActions } from '..'
import type { SendEmailArgs } from '../action'
import { createEmailVars } from '../utils'

describe('createEmailVars', async () => {
  const testUtils = createTestUtils({ envFiles: [testEnvFile] })

  const v = getEnvVars(testUtils.fictionEnv, ['AWS_ACCESS_KEY', 'AWS_ACCESS_KEY_SECRET', 'AWS_BUCKET_MEDIA'] as const)

  const { awsAccessKey, awsAccessKeySecret, awsBucketMedia } = v

  const fictionAws = new FictionAws({ ...testUtils, awsAccessKey, awsAccessKeySecret })
  const fictionMedia = new FictionMedia({ ...testUtils, fictionAws, awsBucketMedia })

  const fictionEmailActions = new FictionEmailActions({ ...testUtils, fictionMedia })
  const initialized = await testUtils.init()

  const getDefaultArgs = (): SendEmailArgs & { actionId: string, fictionEmailActions: FictionEmailActions } => {
    return {
      actionId: 'actionTest',
      recipient: initialized.user,
      origin: 'https://www.example.com',
      redirect: 'http://example.com/redirect',
      baseRoute: '/base',
      fictionEmailActions,
    }
  }

  it('should create email vars successfully', async () => {
    const emailVars = await createEmailVars(getDefaultArgs())

    expect(emailVars.actionId).toBe('actionTest')
    expect(emailVars.appName).toBe('Test Fiction App')
    const u = new URL(emailVars.callbackUrl)
    expect(u.origin + u.pathname).toBe(`https://www.example.com/base/__transaction/action-test`)
    expect(u.searchParams.get('token')).toBe(createUserToken({ user: initialized.user, tokenSecret: testUtils.fictionUser.tokenSecret }))
    expect(u.searchParams.get('redirect')).toBe('http://example.com/redirect')
    expect(emailVars.code).toBe(initialized.user.verify?.code)
    expect(emailVars.unsubscribeUrl).toBe('https://www.example.com/base/__transaction/unsubscribe')
    expect(emailVars.fullName).toBe(initialized.user.fullName)
    expect(emailVars.email).toBe(initialized.user.email)

    expect(Object.keys(emailVars)).toMatchInlineSnapshot(`
      [
        "actionId",
        "redirect",
        "fullName",
        "email",
        "userId",
        "username",
        "token",
        "code",
        "originUrl",
        "callbackUrl",
        "unsubscribeUrl",
        "appName",
        "queryVars",
      ]
    `)
  })

  it('should error if no recipient', async () => {
    const args = getDefaultArgs()

    // @ts-expect-error test
    args.recipient = undefined

    await expect(createEmailVars(args)).rejects.toThrowErrorMatchingInlineSnapshot(`[EndpointError: no recipient user provided]`)
  })
})
