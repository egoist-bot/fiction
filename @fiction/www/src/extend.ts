import * as themeFiction from '@fiction/theme-fiction'
import * as themeMinimal from '@fiction/theme-minimal'
import * as themeAdmin from '@fiction/admin/theme'
import type { FictionEnv, FictionObject } from '@fiction/core'
import type { Theme } from '@fiction/site/theme'
import type { FictionStripe } from '@fiction/plugins/plugin-stripe'
import { getExtensionIndexTypeHelper } from '@fiction/plugin-extend'
import type { SpecificService } from '.'

export async function getThemes(args: { fictionEnv: FictionEnv, fictionStripe: FictionStripe }): Promise<Theme[]> {
  const themes = Promise.all([
    themeFiction.setup(args),
    themeMinimal.setup(args),
    themeAdmin.setup(args),
  ])

  return themes
}

export function getExtensionIndex(args: SpecificService) {
  return getExtensionIndexTypeHelper([
    {
      load: () => import('@fiction/plugin-posts'),
      settings: () => ({ test: true, ...args }),
    },
  ])
}
