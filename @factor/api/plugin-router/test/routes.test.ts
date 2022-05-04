import { expect, it, describe } from "vitest"
import { AppRoute } from "../appRoute"
import { FactorRouter } from ".."

const routes = [
  new AppRoute({
    name: "home",
    niceName: "Home",
    path: "/",
    menus: ["test"],
    component: () => import("./ElTest.vue"),
  }),

  new AppRoute({
    name: "notFound404",
    niceName: "404",
    path: "/:pathMatch(.*)*",
    priority: 1000,
    component: () => import("./ElTest.vue"),
  }),
  new AppRoute({
    name: "dashboard",
    niceName: "Dashboard",
    parent: "app",
    path: "/project/:projectId",
    menus: ["test"],
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
</svg>`,
    component: () => import("./ElTest.vue"),
  }),
  new AppRoute({
    name: "dashboardSingle",
    niceName: "Dashboard View",
    parent: "app",
    path: "/project/:projectId/dash/:dashboardId",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
</svg>`,
    component: () => import("./ElTest.vue"),
  }),

  new AppRoute({
    name: "app",
    niceName: "App",
    path: "/app",
    component: () => import("./ElTest.vue"),
    priority: 10,
  }),
]

const factorRouter = new FactorRouter({ routes })
describe("route handling", () => {
  it("generates routes for vue router", () => {
    expect(true).toBe(true)

    expect(factorRouter.vueRoutes.value).toMatchInlineSnapshot(`
      [
        {
          "children": [
            {
              "component": [Function],
              "meta": {
                "menus": [
                  "test",
                ],
                "niceName": "Dashboard",
              },
              "name": "dashboard",
              "path": "/project/:projectId",
            },
            {
              "component": [Function],
              "meta": {
                "menus": [],
                "niceName": "Dashboard View",
              },
              "name": "dashboardSingle",
              "path": "/project/:projectId/dash/:dashboardId",
            },
          ],
          "component": [Function],
          "meta": {
            "menus": [],
            "niceName": "App",
          },
          "name": "app",
          "path": "/app",
        },
        {
          "component": [Function],
          "meta": {
            "menus": [
              "test",
            ],
            "niceName": "Home",
          },
          "name": "home",
          "path": "/",
        },
        {
          "component": [Function],
          "meta": {
            "menus": [],
            "niceName": "404",
          },
          "name": "notFound404",
          "path": "/:pathMatch(.*)*",
        },
      ]
    `)
  })

  it("gets menu items", () => {
    const testMenuItems = factorRouter.menu("test").value
    expect(testMenuItems.length).toBe(2)
    expect(factorRouter.menu("test").value).toMatchInlineSnapshot(`
      [
        {
          "active": false,
          "icon": undefined,
          "key": "home",
          "name": "Home",
          "route": "/",
        },
        {
          "active": false,
          "icon": "<svg xmlns=\\"http://www.w3.org/2000/svg\\" fill=\\"none\\" viewBox=\\"0 0 24 24\\" stroke=\\"currentColor\\">
        <path stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" stroke-width=\\"2\\" d=\\"M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z\\" />
      </svg>",
          "key": "dashboard",
          "name": "Dashboard",
          "route": "/project/:projectId",
        },
      ]
    `)
  })
})