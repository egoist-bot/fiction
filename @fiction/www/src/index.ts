import path from 'node:path'
import { FictionUi } from '@fiction/ui'
import type { ServiceConfig } from '@fiction/core'
import { AppRoute, FictionApp, FictionAws, FictionCache, FictionDb, FictionEmail, FictionEnv, FictionMedia, FictionRouter, FictionServer, FictionUser, apiRoot, safeDirname } from '@fiction/core'
import { FictionEmailActions } from '@fiction/plugin-email-actions'
import { FictionTeam } from '@fiction/core/plugin-team'
import { FictionMonitor } from '@fiction/plugin-monitor'
import { FictionStripe } from '@fiction/plugin-stripe'
import { FictionDevRestart } from '@fiction/core/plugin-env/restart'
import { FictionSites } from '@fiction/site'
import { FictionAdmin } from '@fiction/admin'
import FSite from '@fiction/cards/CardSite.vue'
import { FictionAi } from '@fiction/plugin-ai'
import { FictionExtend } from '@fiction/plugin-extend'
import { FictionSubscribe } from '@fiction/plugin-subscribe'
import { getEnvVars } from '@fiction/core/utils'
import { version } from '../package.json'
import { getExtensionIndex, getThemes } from './extend'
import { commands } from './commands'

const cwd = safeDirname(import.meta.url, '..')

const meta = { version, app: { name: 'Fiction', email: 'admin@fiction.com', url: `https://www.fiction.com`, domain: `fiction.com` } }
const appUrl = `https://www.${meta.app.domain}`
const appUrlSites = `https://*.${meta.app.domain}`

const envFiles = [path.join(apiRoot, './.env')]
const mainFilePath = path.join(cwd, './src/index.ts')

const fictionEnv = new FictionEnv({ cwd, envFiles, envFilesProd: envFiles, mainFilePath, version, commands, meta })

const envVarNames = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'TOKEN_SECRET',
  'POSTGRES_URL',
  'SMTP_HOST',
  'SMTP_PASSWORD',
  'SMTP_USER',
  'SLACK_WEBHOOK_URL',
  'SENTRY_PUBLIC_DSN',
  'AWS_ACCESS_KEY',
  'AWS_ACCESS_KEY_SECRET',
  'AWS_BUCKET_MEDIA',
  'AWS_REGION',
  'FLY_API_TOKEN',
  'OPENAI_API_KEY',
  'REDIS_URL',
] as const

const v = getEnvVars(fictionEnv, envVarNames)
const { flyApiToken, googleClientId, googleClientSecret, tokenSecret, postgresUrl, smtpHost, smtpPassword, smtpUser, slackWebhookUrl, sentryPublicDsn, awsAccessKey, awsBucketMedia, awsRegion, awsAccessKeySecret, openaiApiKey } = v

const comboPort = +fictionEnv.var('APP_PORT')

const fictionRouter = new FictionRouter({
  routerId: 'parentRouter',
  fictionEnv,
  baseUrl: fictionEnv.meta.app?.url,
  routes: (fictionRouter) => {
    return [
      new AppRoute({ name: 'email', path: '/test-email', component: (): Promise<any> => import('@fiction/core/plugin-email/preview/EmailPreview.vue') }),
      new AppRoute({ name: 'themeMinimal', path: '/theme-minimal/:viewId?/:itemId?', component: FSite, props: { siteRouter: fictionRouter, themeId: 'minimal' }, noSitemap: true }),
      new AppRoute({ name: 'testEditor', path: '/test-editor', component: (): Promise<any> => import('@fiction/plugin-editor/test/TestEditor.vue'), noSitemap: true }),
      new AppRoute({ name: 'testInputs', path: '/inputs', component: (): Promise<any> => import('@fiction/ui/inputs/test/TestInputsAll.vue'), noSitemap: true }),
      new AppRoute({ name: 'dash', path: '/app/:viewId?/:itemId?', component: FSite, props: { siteRouter: fictionRouter, themeId: 'admin' }, noSitemap: true }),
      new AppRoute({ name: 'engine', path: '/:viewId?/:itemId?', component: FSite, props: { siteRouter: fictionRouter, themeId: 'fiction' } }),
    ]
  },
})

const fictionApp = new FictionApp({
  liveUrl: fictionEnv.meta.app?.url,
  port: comboPort,
  fictionRouter,
  isLive: fictionEnv.isProd,
  fictionEnv,
  srcFolder: path.join(cwd, './src'),
  fictionOrgId: fictionEnv.var('FICTION_ORG_ID'),
  fictionSiteId: fictionEnv.var('FICTION_SITE_ID'),
})

const fictionRouterSites = new FictionRouter({
  routerId: 'siteRouter',
  fictionEnv,
  baseUrl: appUrlSites,
  routes: [new AppRoute({ name: 'engine', path: '/:viewId?/:itemId?', component: FSite })],
})

const fictionAppSites = new FictionApp({
  appInstanceId: 'sites',
  fictionEnv,
  fictionRouter: fictionRouterSites,
  port: +fictionEnv.var('SITES_PORT'),
  localHostname: '*.lan.com',
  liveUrl: appUrlSites,
  altHostnames: [{ prod: `theme-minimal.${fictionEnv.meta.app?.domain}`, dev: 'theme-minimal.lan.com' }],
  isLive: fictionEnv.isProd,
  srcFolder: path.join(cwd, './src'),
})

const fictionServer = new FictionServer({ fictionEnv, serverName: 'FictionMain', port: comboPort, liveUrl: appUrl })
const fictionDb = new FictionDb({ fictionEnv, fictionServer, postgresUrl })
const fictionEmail = new FictionEmail({ fictionEnv, smtpHost, smtpPassword, smtpUser })

const base = { fictionEnv, fictionApp, fictionServer, fictionDb, fictionEmail, fictionRouter }

const fictionUser = new FictionUser({ ...base, googleClientId, googleClientSecret, tokenSecret })

fictionUser.events.on('logout', () => {
  fictionEnv.events.emit('notify', { type: 'success', message: 'You have been logged out.' })
})

const fictionCache = new FictionCache({ ...base })
const fictionMonitor = new FictionMonitor({ ...base, fictionUser, slackWebhookUrl, sentryPublicDsn })

const basicService = { ...base, fictionUser, fictionMonitor }

const fictionAws = new FictionAws({ ...basicService, awsAccessKey, awsAccessKeySecret })
const fictionMedia = new FictionMedia({ ...basicService, fictionAws, awsBucketMedia, cdnUrl: `https://media.fiction.com` })
const fictionEmailActions = new FictionEmailActions({ ...basicService, fictionMedia })
const fictionAi = new FictionAi({ ...basicService, fictionMedia, openaiApiKey })
const fictionAdmin = new FictionAdmin({ ...basicService, fictionEmailActions, fictionMedia })

const pluginServices = { ...basicService, fictionCache, fictionAppSites, fictionRouterSites, fictionAws, fictionMedia, fictionAi, fictionEmailActions, fictionAdmin }

const fictionSubscribe = new FictionSubscribe({ ...pluginServices })

const fictionStripe = new FictionStripe({
  ...pluginServices,
  secretKeyLive: fictionEnv.var('STRIPE_SECRET_KEY_PROD'),
  publicKeyLive: fictionEnv.var('STRIPE_PUBLIC_KEY_PROD'),
  secretKeyTest: fictionEnv.var('STRIPE_SECRET_KEY_TEST'),
  publicKeyTest: fictionEnv.var('STRIPE_PUBLIC_KEY_TEST'),
  customerPortalUrl: `https://billing.stripe.com/p/login/fZedS66gTaiegww7ss`,
  products: [
    {
      alias: 'standard',
      productId: 'prod_Ptz7sEMEmJvZ6s',
      tier: 10,
      pricing: [
        { duration: 'month', priceId: 'price_1P4B95FofsEYcKEPApAIRcWH' },
        { duration: 'year', priceId: 'price_1P4B95FofsEYcKEPjdwAKb9j' },
      ],
    },
    {
      alias: 'pro',
      productId: 'prod_PtzAeKqhL7w5fs',
      tier: 20,
      pricing: [
        { duration: 'month', priceId: 'price_1P4BCZFofsEYcKEPX8BAkBlt' },
        { duration: 'year', priceId: 'price_1P4BDBFofsEYcKEPdz8dDkT4' },
      ],
    },
    {
      alias: 'advanced',
      productId: 'prod_PtzDXv4G19aO4m',
      tier: 30,
      pricing: [
        { duration: 'month', priceId: 'price_1P4BF6FofsEYcKEPW6rBsDVO' },
        { duration: 'year', priceId: 'price_1P4BFjFofsEYcKEPU6zDPhfl' },
      ],
    },
  ],
})

const fictionSites = new FictionSites({
  ...pluginServices,
  fictionAppSites,
  fictionRouterSites,
  flyApiToken,
  flyAppId: 'fiction-sites',
  adminBaseRoute: '/admin',
  themes: () => getThemes({ fictionEnv, fictionStripe }),
})

const fictionTeam = new FictionTeam({ ...pluginServices })

const fictionUi = new FictionUi({ fictionEnv, apps: [fictionApp, fictionAppSites] })

const baseService = { ...pluginServices, fictionSites, fictionTeam, fictionUi, fictionStripe, fictionSubscribe }

export type SpecificService = typeof baseService

const fictionExtend = new FictionExtend({ ...pluginServices, extensionIndex: getExtensionIndex(baseService) })

const service = {
  ...baseService,
  fictionExtend,
}

export function setup(): ServiceConfig {
  async function initializeBackingServices() {
    await Promise.all([fictionDb.init(), fictionEmail.init()])
  }
  return {
    service,
    runVars: {},
    runCommand: async (args) => {
      const { command, options = {}, context } = args

      if (command.endsWith('-r')) {
        const realCommand = command.split('-').shift()
        if (!realCommand)
          throw new Error('No command for restart')
        await new FictionDevRestart({ fictionEnv }).restartInitializer({
          command: realCommand,
          config: { watch: [safeDirname(import.meta.url, '../../..')] },
        })
      }
      else {
        await initializeBackingServices()

        if (command === 'app' || command === 'dev') {
          const { build } = options as { build?: boolean, useLocal?: boolean }

          const srv = await fictionServer.initServer({ useLocal: true, fictionUser })

          if (context === 'node') {
            if (build) {
              await fictionApp.buildApp()
              await fictionAppSites.buildApp()
            }

            const mode = command !== 'dev' ? 'prod' : 'dev'
            await fictionApp.ssrServerSetup({ expressApp: srv?.expressApp, mode })

            await srv?.run()

            await fictionAppSites.ssrServerCreate({ mode })

            fictionApp.logReady({ serveMode: 'comboSSR' })
          }
          else if (context === 'app') {
            fictionUser.init()
          }
        }
        else if (command === 'sites') {
          const { build } = options as { build?: boolean, useLocal?: boolean }
          const srv = await fictionServer.initServer({ useLocal: true, fictionUser, port: fictionAppSites.port.value })
          if (context === 'node') {
            if (build)
              await fictionAppSites.buildApp()

            await fictionAppSites.ssrServerSetup({ expressApp: srv?.expressApp, mode: 'prod' })

            await srv?.run()

            fictionAppSites.logReady({ serveMode: 'comboSSR' })
          }
          else if (context === 'app') {
            fictionUser.init()
          }
        }

        else if (command === 'build' || command === 'render') {
          const { serve } = options
          await fictionAppSites.buildApp({ serve, render: false })
          await fictionApp.buildApp({ serve, render: false })
        }
        else if (command === 'generate') {
          await fictionDb.init()
          await fictionEnv.generate()
        }
      }
    },

    createMount: async (args) => {
      // APP_INSTANCE is the APP being run
      if (args.serviceConfig.runVars?.APP_INSTANCE === 'sites') {
        return await fictionAppSites.mountApp(args)
      }
      else {
        // prevent sub route from screwing with URL
        // fictionRouterSites.historyMode = 'memory'
        // fictionRouterSites.create()
        return await fictionApp.mountApp(args)
      }
    },
  }
}
