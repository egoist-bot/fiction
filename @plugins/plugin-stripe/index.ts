import { UserConfig } from "@factor/types"
import { logger } from "@factor/api"
import { Endpoint } from "@factor/engine"
import { getPaymentEndpointsMap } from "./endpoints"
import { EndpointMethodStripeHooks } from "./endpointHooks"
import { StripeOptions, createSettings, stripeEnv } from "./util"

export * from "./util"
export * from "./endpoints"
export * from "./subscription"

export const setup = async (
  options: Partial<StripeOptions>,
): Promise<UserConfig> => {
  createSettings(options)

  return {
    name: "StripePluginServer",
    server: async (): Promise<UserConfig> => {
      const stripePublicKey =
        stripeEnv() == "production"
          ? process.env.STRIPE_PUBLIC_KEY_LIVE
          : process.env.STRIPE_PUBLIC_KEY_TEST
      const stripeSecretKey =
        stripeEnv() == "production"
          ? process.env.STRIPE_SECRET_KEY_LIVE
          : process.env.STRIPE_SECRET_KEY_TEST

      let endpoints: Endpoint[] = []
      if (!stripePublicKey) {
        logger.log({
          level: "error",
          context: "StripePlugin",
          description: `Stripe public key is missing: '${stripeEnv()}'`,
        })
      } else if (!stripeSecretKey) {
        logger.log({
          level: "error",
          context: "StripePlugin",
          description: `Stripe secret key is missing: '${stripeEnv()}'`,
        })
      } else {
        endpoints = [
          ...Object.values(getPaymentEndpointsMap()),
          new EndpointMethodStripeHooks(),
        ]
      }

      return {
        endpoints,
        serverOnlyImports: [{ id: "stripe" }],
      }
    },
    paths: [new URL(".", import.meta.url).pathname],
  }
}
