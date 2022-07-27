// eslint-disable-next-line import/no-unresolved
import "uno.css"
import "@unocss/reset/tailwind.css"
import { createSSRApp } from "vue"
import {
  createRouter,
  createWebHistory,
  createMemoryHistory,
  RouteRecordRaw,
} from "vue-router"
import PageHome from "./el/PageHome.vue"
import PageWrap from "./el/PageWrap.vue"
import PageSingle from "./el/PageSingle.vue"

export const initApp = (config: { env: "server" | "client" }) => {
  const { env } = config
  const app = createSSRApp(PageWrap)
  const history = env == "server" ? createMemoryHistory() : createWebHistory()
  const routes: RouteRecordRaw[] = [
    {
      name: "home",
      path: "/",
      component: PageHome,
    },
    { name: "tour", path: "/tour", component: PageSingle },
    { name: "contact", path: "/contact", component: PageSingle },
    { name: "about", path: "/about", component: PageSingle },
  ]
  const router = createRouter({ history, routes })

  app.use(router)

  return { app, router }
}
