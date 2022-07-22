import http from "http"
import path from "path"
import compression from "compression"
import serveFavicon from "serve-favicon"
import serveStatic from "serve-static"
import fs from "fs-extra"
import { minify } from "html-minifier"
import { Express } from "express"
import * as vite from "vite"
import unocss from "unocss/vite"
import presetIcons from "@unocss/preset-icons"
import { renderToString } from "@vue/server-renderer"
import type tailwindcss from "tailwindcss"
import {
  vue,
  importIfExists,
  initializeResetUi,
  getMeta,
  renderMeta,
  HookType,
  requireIfExists,
  getRequire,
  safeDirname,
} from "../utils"
import {
  ServiceConfig,
  FactorAppEntry,
  FactorEnv,
  vars,
  EnvVar,
  StandardPaths,
} from "../plugin-env"
import { FactorPlugin } from "../plugin"
import { FactorBuild } from "../plugin-build"
import { FactorServer } from "../plugin-server"
import { FactorRouter } from "../plugin-router"
import { version } from "../package.json"
import { ServerModuleDef } from "../plugin-build/types"
import { FactorDevRestart } from "../plugin-env/restart"
import { getMarkdownPlugin } from "./utils/vitePluginMarkdown"
import * as types from "./types"
import { renderPreloadLinks, getFaviconPath } from "./utils"
import { FactorSitemap } from "./sitemap"

vars.register(() => [
  new EnvVar({
    name: "SERVER_PORT",
    val: process.env.SERVER_PORT,
    isOptional: true,
  }),
  new EnvVar({
    name: "SERVER_URL",
    val: process.env.SERVER_URL,
    verify: ({ factorEnv, value }) => {
      return factorEnv.isApp() && !value ? false : true
    },
  }),
  new EnvVar({ name: "APP_PORT", val: process.env.APP_PORT, isOptional: true }),
  new EnvVar({
    name: "APP_URL",
    val: process.env.APP_URL,
    verify: ({ factorEnv, value }) => {
      return factorEnv.isApp() && !value ? false : true
    },
  }),
])

type HookDictionary = {
  appMounted: { args: [FactorAppEntry] }
  afterAppSetup: { args: [{ serviceConfig: ServiceConfig }] }
  viteConfig: { args: [vite.InlineConfig[]] }
  htmlHead: { args: [string, { pathname?: string }] }
  htmlBody: { args: [string, { pathname?: string }] }
}

export type FactorAppSettings = {
  hooks?: HookType<HookDictionary>[]
  mode?: "production" | "development"
  isTest?: boolean
  productionUrl?: string
  port: number
  factorServer?: FactorServer
  factorEnv: FactorEnv
  rootComponent: vue.Component
  factorRouter: FactorRouter
  sitemaps?: types.SitemapConfig[]
  uiPaths?: string[]
  serverOnlyImports?: ServerModuleDef[]
  ui?: Record<string, () => Promise<vue.Component>>
}

export class FactorApp extends FactorPlugin<FactorAppSettings> {
  types = types
  viteDevServer?: vite.ViteDevServer
  hooks = this.settings.hooks ?? []
  uiPaths = this.settings.uiPaths ?? []
  serverOnlyImports = this.settings.serverOnlyImports ?? []
  factorRouter = this.settings.factorRouter
  ui = this.settings.ui || {}
  mode = this.settings.mode || this.utils.mode()
  isTest = this.settings.isTest || this.utils.isTest()
  rootComponent = this.settings.rootComponent
  factorBuild?: FactorBuild
  factorDevRestart?: FactorDevRestart
  factorSitemap?: FactorSitemap
  factorServer = this.settings.factorServer
  factorEnv = this.settings.factorEnv
  appName: string
  appEmail: string
  sitemaps = this.settings.sitemaps ?? []
  standardPaths?: StandardPaths = this.factorEnv.standardPaths
  port = this.settings.port || 3000
  appServer?: http.Server
  staticServer?: http.Server
  localUrl = `http://localhost:${this.port}`
  productionUrl = this.settings.productionUrl || this.localUrl
  appUrl = this.mode == "production" ? this.productionUrl : this.localUrl
  vars: Record<string, string | boolean | number> = {
    COMMAND: process.env.COMMAND || "",
    COMMAND_OPTS: process.env.COMMAND_OPTS || "",
    MODE: this.mode,
    IS_TEST: this.isTest,
    IS_VITE: "1",
    SERVER_URL: this.factorServer?.serverUrl ?? "",
    APP_URL: this.appUrl,
  }

  constructor(settings: FactorAppSettings) {
    super(settings)

    process.env.APP_PORT = this.port?.toString()

    const cwd = this.factorEnv.standardPaths?.cwd

    this.appEmail = this.factorEnv.appEmail
    this.appName = this.factorEnv.appName
    /**
     * node application init
     */
    if (cwd && !this.utils.isApp() && this.factorEnv) {
      this.factorBuild = new FactorBuild({ factorEnv: this.factorEnv })
      this.factorSitemap = new FactorSitemap({
        factorRouter: this.factorRouter,
      })
    }

    this.addSchema()
  }

  async setup() {
    return {}
  }

  addSchema() {
    if (this.factorEnv) {
      this.factorEnv.addHook({
        hook: "staticSchema",
        callback: async (existing) => {
          const routeKeys = this.factorRouter.routes.value
            ?.map((_) => _.name)
            .filter(Boolean)
            .sort()

          const uiKeys = Object.keys(this.ui).sort()

          return {
            ...existing,
            routes: { enum: routeKeys, type: "string" },
            ui: { enum: uiKeys, type: "string" },
            menus: { enum: [""], type: "string" },
          }
        },
      })

      this.factorEnv.addHook({
        hook: "staticConfig",
        callback: (
          schema: Record<string, unknown>,
        ): Record<string, unknown> => {
          return {
            ...schema,
            routes: this.factorRouter.routes.value?.map((ep) => ({
              key: ep.name,
              path: ep.path,
            })),
          }
        },
      })
    }
  }

  public addHook(hook: HookType<HookDictionary>): void {
    this.hooks.push(hook)
  }

  addUi(components: Record<string, () => Promise<vue.Component>>) {
    this.ui = { ...this.ui, ...components }
  }

  addSitemaps(sitemaps: types.SitemapConfig[]) {
    this.sitemaps = [...this.sitemaps, ...sitemaps]
  }

  addUiPaths(uiPaths: string[]) {
    this.uiPaths = [...this.uiPaths, ...uiPaths]
  }

  addServerOnlyImports(serverOnlyImports: ServerModuleDef[]) {
    this.serverOnlyImports = [...this.serverOnlyImports, ...serverOnlyImports]
  }

  createUi = (ui: Record<string, () => Promise<vue.Component>>) => {
    return Object.fromEntries(
      Object.entries(ui).map(([key, component]) => {
        return [key, vue.defineAsyncComponent(component)]
      }),
    )
  }

  createVueApp = async (params: {
    renderUrl?: string
    serviceConfig: ServiceConfig
  }): Promise<FactorAppEntry> => {
    const { renderUrl, serviceConfig } = params

    const router = this.factorRouter.update()

    await this.utils.runHooks<HookDictionary, "afterAppSetup">({
      list: this.hooks,
      hook: "afterAppSetup",
      args: [{ serviceConfig }],
    })

    const { service = {} } = serviceConfig

    const app: vue.App = renderUrl
      ? vue.createSSRApp(this.rootComponent)
      : vue.createApp(this.rootComponent)

    app.provide("service", service)
    app.provide("ui", this.createUi(this.ui))
    app.use(router)

    if (renderUrl) {
      await this.factorRouter.replace(
        { path: renderUrl },
        { id: "createVueApp" },
      )
    }
    await router.isReady()

    const meta = getMeta()
    app.use(meta)
    return { app, meta, service }
  }

  mountApp = async (params: {
    selector?: string
    renderUrl?: string
    serviceConfig: ServiceConfig
  }): Promise<FactorAppEntry> => {
    const { selector = "#app" } = params

    const entry = await this.createVueApp(params)

    await this.factorEnv.crossRunCommand()

    if (typeof window != "undefined") {
      initializeResetUi(this.factorRouter).catch(console.error)

      entry.app.mount(selector)
      document.querySelector(selector)?.classList.add("loaded")
      document.querySelector(".styles-loading")?.remove()

      await this.utils.runHooks<HookDictionary, "appMounted">({
        list: this.hooks,
        hook: "appMounted",
        args: [entry],
      })
    }

    return entry
  }

  getViteServer = async (): Promise<vite.ViteDevServer> => {
    if (!this.viteDevServer) {
      const config = await this.getViteConfig()

      const serverConfig = this.utils.deepMergeAll([
        config,
        {
          appType: "custom",
          server: { middlewareMode: true },
        },
      ])

      this.viteDevServer = await vite.createServer(serverConfig)
    }

    return this.viteDevServer
  }

  getIndexHtml = async (params?: { pathname: string }): Promise<string> => {
    const { pathname = "/" } = params || {}
    const { dist, sourceDir } = this.standardPaths || {}

    if (!dist) throw new Error("dist is required")
    if (!sourceDir) throw new Error("sourceDir is required")

    const srcHtml = path.join(sourceDir, "index.html")

    if (!fs.existsSync(srcHtml)) {
      throw new Error(`no index.html in app (${srcHtml})`)
    }

    const rawTemplate = fs.readFileSync(srcHtml, "utf8")

    // alias is need for vite/rollup to handle correctly
    const clientTemplatePath =
      this.mode == "production" ? `@MOUNT_FILE_ALIAS` : "/@mount.ts" //`/@fs${mountFilePath}`

    let template = rawTemplate.replace(
      "</body>",
      `<script type="module" src="${clientTemplatePath}"></script>
    </body>`,
    )

    if (this.mode !== "production" && pathname) {
      const srv = await this.getViteServer()
      template = await srv.transformIndexHtml(pathname, template)
    }

    if (this.mode == "production") {
      fs.ensureDirSync(dist)
      fs.writeFileSync(path.join(dist, "index.html"), template)
    }

    return template
  }

  /**
   * Gets file content needed to render HTML
   * @notes
   *  - in production takes from pre-generated client
   *  - in development, looks in SRC folder for index.html
   */
  htmlGenerators = async (): Promise<types.RenderConfig> => {
    const { distClient } = this.standardPaths || {}

    if (!distClient) throw new Error("dist is required")

    const out: types.RenderConfig = { template: "", manifest: {} }

    if (this.mode == "production") {
      fs.ensureDirSync(distClient)
      const indexHtmlPath = path.resolve(distClient, "./index.html")
      out.template = fs.readFileSync(indexHtmlPath, "utf8")
      const manifestPath = path.resolve(distClient, "./ssr-manifest.json")
      out.manifest = (await import(/* @vite-ignore */ manifestPath)) as Record<
        string,
        any
      >
    } else {
      out.template = await this.getIndexHtml({ pathname: "/" })
    }

    return out
  }

  renderParts = async (
    params: types.RenderConfig,
  ): Promise<types.RenderedHtmlParts> => {
    const { pathname, manifest } = params
    const { distServerEntry } = this.standardPaths || {}
    const prod = this.mode == "production" ? true : false

    if (!distServerEntry) throw new Error("distServerEntry is missing")

    const out = {
      htmlBody: "",
      preloadLinks: "",
      htmlHead: "",
      htmlAttrs: "",
      bodyAttrs: "",
    }

    let entryModule: Record<string, any>

    if (prod) {
      /**
       * Use pre-build server module in Production
       * otherwise use Vite's special module loader
       *
       */
      if (prod) {
        entryModule = (await import(
          /* @vite-ignore */ path.join(distServerEntry)
        )) as Record<string, any>
      } else {
        const srv = await this.getViteServer()
        entryModule = await srv.ssrLoadModule("./mount.ts")
      }

      const { runViteApp } = entryModule as types.EntryModuleExports

      const factorAppEntry = await runViteApp({ renderUrl: pathname })

      const { app, meta } = factorAppEntry

      /**
       * Pass context for rendering (available useSSRContext())
       * vitejs/plugin-vue injects code in component setup() that registers the component
       * on the context. Allowing us to orchestrate based on this.
       */
      try {
        const ctx: { modules?: string[] } = {}
        out.htmlBody = await renderToString(app, ctx)

        /**
         * SSR manifest maps assets which allows us to render preload links for performance
         */
        if (manifest) {
          out.preloadLinks = renderPreloadLinks(ctx?.modules ?? [], manifest)
        }
      } catch (error) {
        this.log.error(`renderToString error ${pathname}`, { error })
      }

      /**
       * Meta/Head Rendering
       */
      const { headTags: htmlHead, htmlAttrs, bodyAttrs } = renderMeta(meta)
      out.htmlHead = htmlHead
      out.htmlAttrs = htmlAttrs
      out.bodyAttrs = bodyAttrs
    }

    return out
  }

  getRequestHtml = async (params: types.RenderConfig): Promise<string> => {
    const { pathname, manifest, template } = params

    const parts = await this.renderParts({ template, pathname, manifest })
    let { htmlBody, htmlHead } = parts
    const { preloadLinks, htmlAttrs, bodyAttrs } = parts

    if (!template) throw new Error("html template required")

    htmlHead = await this.utils.runHooks({
      list: this.hooks,
      hook: "htmlHead",
      args: [htmlHead, { pathname }],
    })

    htmlBody = await this.utils.runHooks({
      list: this.hooks,
      hook: "htmlBody",
      args: [htmlBody, { pathname }],
    })

    const canonicalUrl = [this.appUrl || "", pathname || ""]
      .map((_: string) => _.replace(/\/$/, ""))
      .join("")

    const html = template
      .replace(
        `<!--factor-debug-->`,
        `<!-- ${JSON.stringify({ pathname }, null, 1)} -->`,
      )
      .replace(
        `<!--factor-head-->`,
        [
          htmlHead,
          preloadLinks,
          `<link href="${canonicalUrl}" rel="canonical">`,
          `<meta name="generator" content="FactorJS ${version}" />`,
        ].join(`\n`),
      )
      .replace(`<!--factor-body-->`, htmlBody)
      .replace(/<body([^>]*)>/i, `<body$1 ${bodyAttrs}>`)
      .replace(/<html([^>]*)>/i, `<html$1 ${htmlAttrs}>`)

    return minify(html, { continueOnParseError: true })
  }

  expressApp = async (): Promise<Express | undefined> => {
    if (this.utils.isApp()) return

    const { distClient, sourceDir, mountFilePath } = this.standardPaths || {}

    if (!distClient || !sourceDir) {
      throw new Error("distClient && sourceDir are required")
    }

    const app = this.utils.express()

    try {
      const faviconFile = getFaviconPath(sourceDir)
      if (faviconFile) {
        app.use(serveFavicon(faviconFile))
      }

      let viteServer: vite.ViteDevServer | undefined = undefined

      const { manifest, template } = await this.htmlGenerators()

      if (this.mode != "production") {
        viteServer = await this.getViteServer()
        app.use(viteServer.middlewares)
      } else {
        app.use(compression())
        app.use(serveStatic(distClient, { index: false }))
      }

      const srv = await this.getViteServer()
      const rawSource = await srv.transformRequest(
        path.join(safeDirname(import.meta.url), "./mount.ts"),
      )

      if (mountFilePath) {
        app.use("/@mount.ts", async (req, res) => {
          res
            .setHeader("Content-Type", "application/javascript")
            .send(rawSource?.code)
            .end()
        })
      }

      // server side rendering
      app.use("*", async (req, res) => {
        const pathname = req.originalUrl

        // This is the page catch all loader,
        // If a file request falls through to this its 404
        // make sure false triggers don't occur
        const rawPath = pathname.split("?")[0]
        if (rawPath.includes(".") && rawPath.split(".").pop() != "html") {
          res.status(404).end()
          return
        }

        try {
          const html = await this.getRequestHtml({
            template,
            pathname,
            manifest,
          })

          res.status(200).set({ "Content-Type": "text/html" }).end(html)
        } catch (error: unknown) {
          const e = error as Error
          viteServer && viteServer.ssrFixStacktrace(e)

          this.log.error("ssr error", { error })
          res.status(500).end(e.stack)
        }
      })
      return app
    } catch (error) {
      this.log.error("issue creating factor express app", { error })

      return app
    }
  }

  logReady(): void {
    const name = this.appName || "Unnamed App"
    const port = `[ ${this.port} ]`

    const mode = this.mode

    this.log.info(`serving app [ready]`, {
      data: {
        name,
        port,
        productionUrl: this.productionUrl,
        localUrl: this.localUrl,
        mode,
      },
    })
  }

  serveApp = async (): Promise<void> => {
    if (this.utils.isApp()) return

    const app = await this.expressApp()

    await new Promise<void>((resolve) => {
      this.appServer = app?.listen(this.port, () => resolve())
    })

    this.logReady()
  }

  close(): void {
    this.log.info("close app")
    this.appServer?.close()
    this.staticServer?.close()
  }

  tailwindConfig = async (): Promise<Record<string, any> | undefined> => {
    const cwd = this.standardPaths?.cwd

    if (!cwd) throw new Error("cwd is required")

    const fullUiPaths = this.uiPaths.map((p) => path.normalize(p))

    const c: Record<string, any>[] = [
      {
        mode: "jit",
        content: fullUiPaths,
      },
    ]

    const userTailwindConfig = await requireIfExists(
      path.join(cwd, "tailwind.config.cjs"),
    )

    if (userTailwindConfig) {
      const userConf = userTailwindConfig as Record<string, any>
      c.push(userConf)
    }

    const config = this.utils.deepMergeAll<Record<string, any>>(
      c.map((_) => {
        return { ..._ }
      }),
    )

    return config
  }

  getAppViteConfigFile = async (): Promise<vite.InlineConfig | undefined> => {
    const cwd = this.standardPaths?.cwd

    if (!cwd) throw new Error("cwd is required")
    const _module = await importIfExists<{
      default: vite.InlineConfig | (() => Promise<vite.InlineConfig>)
    }>(path.join(cwd, "vite.config.ts"))

    let config: vite.InlineConfig | undefined = undefined
    const result = _module?.default

    if (result) {
      if (typeof result == "function") {
        config = await result()
      } else {
        config = result
      }
    }

    return config
  }

  async getViteConfig(): Promise<vite.InlineConfig> {
    const { cwd, sourceDir, publicDir } = this.standardPaths || {}

    if (!cwd) throw new Error("cwd is required")
    if (!sourceDir) throw new Error("sourceDir is required")
    if (!publicDir) throw new Error("publicDir is required")

    const commonVite = await this.factorBuild?.getCommonViteConfig({
      mode: this.mode,
      cwd,
    })

    const appViteConfigFile = await this.getAppViteConfigFile()

    const twPlugin = getRequire()("tailwindcss") as typeof tailwindcss
    const twConfig = (await this.tailwindConfig()) as Parameters<
      typeof twPlugin
    >[0]

    let merge: vite.InlineConfig[] = [
      commonVite || {},
      {
        publicDir,
        css: {
          postcss: {
            plugins: [twPlugin(twConfig), getRequire()("autoprefixer")],
          },
        },
        server: {},
        plugins: [getMarkdownPlugin(), unocss({ presets: [presetIcons()] })],
      },
      appViteConfigFile || {},
    ]

    merge = await this.utils.runHooks({
      list: this.hooks,
      hook: "viteConfig",
      args: [merge],
    })

    const viteConfig = this.utils.deepMergeAll(merge)

    return viteConfig
  }

  buildApp = async (options: {
    render?: boolean
    serve?: boolean
  }): Promise<void> => {
    if (this.utils.isApp()) return

    const { render = true, serve = false } = options
    const { dist, distClient, distServer } = this.factorEnv?.standardPaths || {}

    if (!dist || !distClient || !distServer) {
      throw new Error("dist paths are missing")
    }

    if (!this.appUrl) throw new Error("appUrl is required")

    this.log.info("building application", {
      data: { isNode: this.utils.isNode() },
    })

    try {
      const vc = await this.getViteConfig()

      // build index to dist
      await this.getIndexHtml()

      const clientBuildOptions: vite.InlineConfig = {
        ...vc,
        root: dist,
        build: {
          outDir: distClient,
          emptyOutDir: true,
          ssrManifest: true,
        },
      }

      const serverBuildOptions: vite.InlineConfig = {
        ...vc,
        build: {
          emptyOutDir: true,
          outDir: distServer,
          ssr: true,
          rollupOptions: {
            preserveEntrySignatures: "allow-extension", // not required
            input: path.join(safeDirname(import.meta.url), "./mount.ts"),
            output: { format: "es" },
          },
        },
      }

      await Promise.all([
        vite.build(clientBuildOptions),
        vite.build(serverBuildOptions),
      ])

      this.log.info("[done:build] application built successfully")

      await this.factorSitemap?.generateSitemap({
        appUrl: this.appUrl,
        sitemaps: this.sitemaps,
        distClient,
      })

      if (render) {
        await this.preRender({ serve })
      }
    } catch (error) {
      this.log.error("[error] failed to build application", { error })
    }

    return
  }

  preRenderPages = async (): Promise<void> => {
    const { distStatic, distClient } = this.standardPaths || {}

    if (!distStatic || !distClient) {
      throw new Error("distStatic and distClient required for prerender")
    }

    const generators = await this.htmlGenerators()

    const urls =
      (await this.factorSitemap?.getSitemapPaths({
        sitemaps: this.sitemaps,
      })) || []

    fs.ensureDirSync(distStatic)
    fs.emptyDirSync(distStatic)
    fs.copySync(distClient, distStatic)

    /**
     * @important pre-render in series
     * if pre-rendering isn't in series than parallel builds can interfere with one-another
     */
    const _asyncFunctions = urls.map((pathname: string) => {
      return async (): Promise<string> => {
        const filePath = `${pathname === "/" ? "/index" : pathname}.html`
        this.log.info(`pre-rendering [${filePath}]`)

        const html = await this.getRequestHtml({ ...generators, pathname })

        const writePath = path.join(distStatic, filePath)
        fs.ensureDirSync(path.dirname(writePath))
        fs.writeFileSync(writePath, html)

        this.log.info(`done [${filePath}]`)
        return filePath
      }
    })
    // run in series
    for (const fn of _asyncFunctions) {
      await fn()
    }
    this.log.info(`[done:render]`)
    return
  }

  serveStaticApp = async (): Promise<void> => {
    const { distStatic } = this.standardPaths || {}

    if (!distStatic) throw new Error("distStatic required for serveStaticApp")

    const app = this.utils.express()

    app.use(compression())
    app.use((req, res, next) => {
      if (!req.path.includes(".")) {
        req.url = `${req.url.replace(/\/$/, "")}.html`
      }

      this.log.info(`request at ${req.url}`)
      next()
    })
    app.use(serveStatic(distStatic, { extensions: ["html"] }))

    app.use("*", (req, res) => {
      this.log.info(`serving fallback index.html at ${req.baseUrl}`)
      res.sendFile(path.join(distStatic, "/index.html"))
    })

    this.staticServer = app.listen(this.port, () => {
      this.logReady()
    })
  }

  preRender = async (opts?: { serve: boolean }): Promise<void> => {
    const { serve = false } = opts || {}

    this.log.info("page render starting")

    await this.preRenderPages()

    this.log.info("page render complete")

    if (serve) {
      this.log.info("serving...")
      await this.serveStaticApp()
    }
  }
}
