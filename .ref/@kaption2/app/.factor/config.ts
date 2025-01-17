/* tslint:disable */
/**
 * Automatically generated file, do not modify by hand.
 */

export interface CompiledServiceConfig {
  commands: 'app' | 'build' | 'dev' | 'generate' | 'r-dev' | 'render' | 'server'
  vars:
    | 'APP_PORT'
    | 'AWS_ACCESS_KEY'
    | 'AWS_ACCESS_KEY_SECRET'
    | 'COMMAND'
    | 'COMMAND_OPTS'
    | 'GOOGLE_CLIENT_ID'
    | 'GOOGLE_CLIENT_SECRET'
    | 'IS_TEST'
    | 'NGROK_AUTH_TOKEN'
    | 'NODE_ENV'
    | 'POSTGRES_URL'
    | 'REDIS_URL'
    | 'REPLICATE_API_TOKEN'
    | 'RUNTIME_VERSION'
    | 'SERVER_PORT'
    | 'SLACK_WEBHOOK_URL'
    | 'SMTP_HOST'
    | 'SMTP_PASSWORD'
    | 'SMTP_USER'
    | 'TOKEN_SECRET'
  endpoints:
    | 'CurrentUser'
    | 'FindOneOrganization'
    | 'GenerateApiSecret'
    | 'Login'
    | 'ManageMemberRelation'
    | 'ManageOnboard'
    | 'ManageOrganization'
    | 'ManageSubmission'
    | 'ManageUser'
    | 'MediaAction'
    | 'MediaIndex'
    | 'NewVerificationCode'
    | 'OrgMembers'
    | 'OrganizationsByUserId'
    | 'ResetPassword'
    | 'SaveMedia'
    | 'SeekInviteFromUser'
    | 'SendOneTimeCode'
    | 'SetPassword'
    | 'StartNewUser'
    | 'TeamInvite'
    | 'Unsplash'
    | 'UpdateCurrentUser'
    | 'UpdateOrganizationMemberStatus'
    | 'UserGoogleAuth'
    | 'VerifyAccountEmail'
  routes:
    | 'accountChangeEmail'
    | 'accountChangePassword'
    | 'accountSettings'
    | 'app'
    | 'appTest'
    | 'authLogin'
    | 'authRegister'
    | 'authResetPassword'
    | 'authSetPassword'
    | 'authVerify'
    | 'accountNewOrg'
    | 'developer'
    | 'docs'
    | 'editProfile'
    | 'home'
    | 'notFound404'
    | 'orgHome'
    | 'orgSettings'
    | 'organizationIndex'
    | 'renderCreate'
    | 'support'
    | 'team'
    | 'teamInvite'
    | 'teamMember'
  ui: 'logoDark' | 'logoLight'
  menus: ''
  tables: {
    factor_user:
      | 'userId'
      | 'email'
      | 'username'
      | 'googleId'
      | 'fullName'
      | 'firstName'
      | 'lastName'
      | 'role'
      | 'status'
      | 'site'
      | 'github'
      | 'githubFollowers'
      | 'twitter'
      | 'twitterFollowers'
      | 'facebook'
      | 'linkedin'
      | 'workSeniority'
      | 'workRole'
      | 'bio'
      | 'location'
      | 'hashedPassword'
      | 'emailVerified'
      | 'verificationCode'
      | 'codeExpiresAt'
      | 'avatarUrl'
      | 'about'
      | 'gender'
      | 'birthday'
      | 'phoneNumber'
      | 'address'
      | 'meta'
      | 'invitedById'
      | 'lastOrganizationId'
      | 'lastSeenAt'
      | 'isFictionAdmin'
      | 'onboard'
      | 'pushSubscription'
      | 'createdAt'
      | 'updatedAt'
    factor_organization:
      | 'organizationId'
      | 'username'
      | 'organizationName'
      | 'organizationEmail'
      | 'organizationStatus'
      | 'organizationPlan'
      | 'ownerId'
      | 'avatarUrl'
      | 'customerId'
      | 'customer'
      | 'customerAuthorized'
      | 'customerIdTest'
      | 'customerTest'
      | 'lastSeenAt'
      | 'specialPlan'
      | 'apiSecret'
      | 'timezone'
      | 'dashboards'
      | 'config'
      | 'meta'
      | 'onboard'
      | 'createdAt'
      | 'updatedAt'
    factor_organization_user:
      | 'memberId'
      | 'organizationId'
      | 'userId'
      | 'memberStatus'
      | 'memberAccess'
      | 'memberRole'
      | 'invitedById'
      | 'priority'
      | 'createdAt'
      | 'updatedAt'
    fiction_deleted:
      | 'deletedId'
      | 'organizationId'
      | 'userId'
      | 'deletedType'
      | 'modelId'
      | 'renderId'
      | 'imageId'
      | 'collectionId'
      | 'meta'
      | 'createdAt'
      | 'updatedAt'
    factor_media:
      | 'mediaId'
      | 'userId'
      | 'url'
      | 'originUrl'
      | 'urlSmall'
      | 'originUrlSmall'
      | 'blurhash'
      | 'preview'
      | 'filePath'
      | 'mime'
      | 'width'
      | 'height'
      | 'alt'
      | 'contentEncoding'
      | 'etag'
      | 'bucket'
      | 'size'
      | 'createdAt'
      | 'updatedAt'
    factor_submission:
      | 'submissionId'
      | 'userId'
      | 'notificationEmail'
      | 'appName'
      | 'appUrl'
      | 'name'
      | 'email'
      | 'organizationName'
      | 'organizationUrl'
      | 'organizationTitle'
      | 'message'
      | 'phone'
      | 'twitter'
      | 'github'
      | 'linkedIn'
      | 'createdAt'
      | 'updatedAt'
    [k: string]: unknown
  }
  [k: string]: unknown
}
