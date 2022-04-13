import { App } from "vue"
import { RouteLocationNormalized } from "vue-router"
import type { FullUser } from "./user"

/**
 * Callback hook names and arguments provided
 * @note must return array of args
 */
export interface CallbackDictionary {
  appReady: [App]
  userLoaded: [Partial<FullUser>]
  routeQueryAction: [RouteLocationNormalized]
  afterServerSetup: []
  afterServerCreated: []
  [key: string]: any[]
}