<script lang="ts" setup>
import type { FictionRouter } from '@fiction/core'
import { getColorScheme, log, toLabel, unhead, useService, vue } from '@fiction/core'
import { FrameUtility } from '@fiction/ui/frame/elBrowserFrameUtil'
import ElSpinner from '@fiction/ui/loaders/ElSpinner.vue'
import El404 from '@fiction/ui/page/El404.vue'
import NotifyToaster from '@fiction/ui/notify/NotifyToaster.vue'
import { getThemeFontConfig } from '@fiction/core/utils/fonts'
import handlebars from 'handlebars'
import type { FictionSites, Site } from '@fiction/site'
import { getMountContext, loadSite } from '@fiction/site/load'
import type { FramePostMessageList } from '@fiction/site/utils/frame'

const props = defineProps({
  themeId: { type: String, default: undefined },
  siteRouter: { type: Object as vue.PropType<FictionRouter>, default: undefined },
})

const { fictionSites, runVars, fictionRouterSites, fictionUser, fictionEnv } = useService<{ fictionSites: FictionSites, fictionRouterSites: FictionRouter }>()

const loading = vue.ref(false)
const site = vue.shallowRef<Site>()
const fonts = vue.computed(() => getThemeFontConfig(site?.value?.fullConfig.value?.fonts))
let cleanups: (() => any)[] = []
async function load() {
  loading.value = true

  const currentUrl = typeof window !== 'undefined' ? window.location.href : `ssr:${runVars?.PATHNAME}`

  try {
    const mountContext = getMountContext({
      queryVars: { themeId: props.themeId }, // passed in by route sometimes
      runVars,
    })

    site.value = await loadSite({
      siteRouter: props.siteRouter || fictionRouterSites,
      fictionSites,
      mountContext,
      caller: `CardSite(${props.themeId || 'na'}):${currentUrl}`,
    })
  }
  catch (error) {
    log.error('CardSite.vue', `Error loading site ${(error as Error).message}`, { error })
  }
  finally {
    loading.value = false
  }
}

const page = vue.computed(() => site.value?.currentPage.value)

function getTitleTag() {
  if (page.value?.userConfig.value.seoTitle) {
    return page.value?.userConfig.value.seoTitle
  }

  else {
    const titleTemplate = site.value?.userConfig.value?.titleTemplate || '{{pageTitle}}'
    const pageTitle = page.value?.title?.value || toLabel(page.value?.slug?.value) || 'Home'
    const siteTitle = site.value?.title?.value || 'Untitled Site'

    // Create the title by replacing placeholders with actual values
    const title = handlebars.compile(titleTemplate)({ pageTitle, siteTitle })

    return title
  }
}

function getScript(args: { noscript?: boolean } = {}) {
  const { noscript } = args
  const gtmContainerId = site.value?.fullConfig.value.customCode?.gtmContainerId

  if (noscript) {
    return gtmContainerId
      ? [{ innerHTML: `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmContainerId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe>` }]
      : []
  }
  else {
    const script = [{
      innerHTML: 'document.addEventListener(\'DOMContentLoaded\', function() { document.documentElement.style.visibility = \'visible\'; });',
      type: 'text/javascript',
    }]

    if (gtmContainerId) {
      script.push({
        innerHTML: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmContainerId}');`,
        type: 'text/javascript',
      })
    }

    return script
  }
}

function faviconUrl() {
  const f = site.value?.userConfig.value.favicon?.url || '/favicon.svg'

  return f
}

unhead.useHead({
  htmlAttrs: { lang: 'en', dir: 'ltr' },
  title: () => getTitleTag(),
  meta: [
    { charset: 'UTF-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
    { name: `description`, content: () => (page.value?.userConfig.value.seoDescription || page.value?.description.value || '') },
    { name: 'robots', content: () => (site.value?.userConfig.value.robotsTxt || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1') },
    { property: 'og:site_name', content: () => site.value?.title.value || '' },
    { property: 'og:locale', content: () => site.value?.userConfig.value.locale || 'en_US' },
    { property: 'og:image', content: () => site.value?.userConfig.value.shareImage?.url || '/favicon.png' },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: () => getTitleTag() },
    { property: 'og:url', content: () => site.value?.frame.displayUrl.value },
    { name: 'robots', content: 'index, follow' },
  ],
  link: [
    {
      rel: 'shortcut icon',
      href: () => faviconUrl(),
      type: () => faviconUrl().includes('svg') ? 'image/svg+xml' : '',
      sizes: () => faviconUrl().includes('svg') ? 'any' : '',
    },
    { rel: 'canonical', href: () => site.value?.frame.displayUrl.value },
    { key: 'font-pre', rel: 'preconnect ', href: 'https://fonts.googleapis.com' },
    { key: 'font-static', rel: 'preconnect ', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    { key: 'font', rel: 'stylesheet', href: () => fonts.value?.fontsUrl, id: 'font-link' },
  ],
  script: () => getScript(),
  style: [
    {
      innerHTML: 'html { opacity: 0; transform: scale(.96); transition: opacity 0.7s, transform 0.7s ease; } body.dark { background: #000; }',
    },
  ],
  noscript: () => getScript({ noscript: true }),
})

vue.onServerPrefetch(async () => {
  await load()
})

vue.onMounted(async () => {
  unhead.useHead({
    bodyAttrs: { class: () => site.value?.isDarkMode.value ? 'dark' : 'light' },
  })

  if (!site.value)
    await load()

  if (site.value && site.value.isEditable.value) {
    const util = new FrameUtility<FramePostMessageList>({
      relation: 'child',
      onMessage: (msg) => {
        if (!site.value)
          throw new Error('FrameUtility: Site not found')

        site.value.frame.processFrameMessage({ msg: msg as FramePostMessageList, scope: 'child' })
      },
    })

    // initialize frame message handling
    util.init()

    // initialize resetUi and path watchers
    site?.value.frame.init({ caller: 'FSite' })

    const sw = vue.watch(
      () => site?.value,
      () => {
        if (site.value)
          site.value.frame.setUtil(util)
      },
      { immediate: true },
    )

    cleanups.push(sw)
  }
})

const theme = vue.computed(() => site.value?.colors.value.theme || getColorScheme('gray'))
const primary = vue.computed(() => site.value?.colors.value.primary || getColorScheme('blue'))

fictionEnv.events.on('cleanup', () => {
  cleanups.forEach(c => c && c())
  site.value?.cleanup()
  site.value = undefined
  cleanups = []
})
</script>

<template>
  <div
    :data-page-template-id="site?.currentPage.value.templateId.value ?? '-'"
    :data-site-mode="site?.siteMode.value ?? '-'"
    :data-pathname="site?.currentPath.value ?? '-'"
    :data-view-id="site?.currentViewId.value ?? '-'"
    :data-page-id="site?.activePageId.value ?? '-'"
    :data-theme-id="site?.themeId.value ?? '-'"
    :data-sub-domain="site?.subDomain.value ?? '-'"
    :data-site-id="site?.siteId ?? '-'"
    :data-user-email="fictionUser.activeUser.value?.email ?? '-'"
    class="x-site bg-theme-50 dark:bg-theme-900 text-theme-900 dark:text-theme-0"
  >
    <div class="x-font-body x-site-content relative z-10 bg-theme-0 dark:bg-theme-950" :class="site?.isEditable.value ? '' : ''">
      <div
        class="x-engine"
      >
        <div v-if="loading" class="text-theme-300 dark:text-theme-0 flex justify-center pt-32">
          <ElSpinner class="h-12 w-12" />
        </div>

        <template v-else-if="site">
          <component :is="site.currentPage.value.tpl.value?.settings.el" class="wrap" :card="site.currentPage.value" />
        </template>
        <template v-else>
          <div class="h-dvh w-full grid min-h-full place-items-center bg-theme-900 text-white px-6 py-24 sm:py-32 lg:px-8">
            <El404 class="" heading="No Site Found" sub-heading="No site was found at this URL" />
          </div>
        </template>
      </div>
    </div>
    <NotifyToaster />
  </div>
</template>

<style lang="less">
html,
body,
#app,
.x-site,
.x-engine{
  min-height: 100dvh;
}

.x-site{
  --font-family-mono: v-bind(fonts?.mono);
  --font-family-input: v-bind(fonts?.input);
  --font-family-sans: v-bind(fonts?.sans);
  --font-family-serif: v-bind(fonts?.serif);
  --font-family-title: v-bind(fonts?.title);
  --font-family-body: v-bind(fonts?.body);
  .x-font-title {
    font-family: var(--font-family-title);
    letter-spacing: -.02em;
  }
  .x-font-body {
    font-family: var(--font-family-body);
  }
  .x-font-input {
    font-family: var(--font-family-input);
  }
  .x-font-mono {
    font-family: var(--font-family-mono);
  }
  .x-font-sans {
    font-family: var(--font-family-sans);
  }

  --theme-0: v-bind("theme[0]");
  --theme-25: v-bind("theme[25]");
  --theme-50: v-bind("theme[50]");
  --theme-100: v-bind("theme[100]");
  --theme-200: v-bind("theme[200]");
  --theme-300: v-bind("theme[300]");
  --theme-400: v-bind("theme[400]");
  --theme-500: v-bind("theme[500]");
  --theme-600: v-bind("theme[600]");
  --theme-700: v-bind("theme[700]");
  --theme-800: v-bind("theme[800]");
  --theme-900: v-bind("theme[900]");
  --theme-950: v-bind("theme[950]");
  --theme-975: v-bind("theme[975]");
  --theme-1000: v-bind("theme[1000]");
  --primary-0: v-bind("primary?.[0]");
  --primary-25: v-bind("primary?.[25]");
  --primary-50: v-bind("primary?.[50]");
  --primary-100: v-bind("primary?.[100]");
  --primary-200: v-bind("primary?.[200]");
  --primary-300: v-bind("primary?.[300]");
  --primary-400: v-bind("primary?.[400]");
  --primary-500: v-bind("primary?.[500]");
  --primary-600: v-bind("primary?.[600]");
  --primary-700: v-bind("primary?.[700]");
  --primary-800: v-bind("primary?.[800]");
  --primary-900: v-bind("primary?.[900]");
  --primary-950: v-bind("primary?.[950]");
  --primary-975: v-bind("primary?.[975]");
  --primary-1000: v-bind("primary?.[1000]");

}

/* Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>
