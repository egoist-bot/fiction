import multer from 'multer'
import { FormData } from 'formdata-node'
import type { FictionPluginSettings } from '../plugin'
import { FictionPlugin } from '../plugin'
import type { FictionDb } from '../plugin-db'
import type { FictionServer } from '../plugin-server'
import type { FictionUser } from '../plugin-user'
import type { FictionAws } from '../plugin-aws'
import { EnvVar, vars } from '../plugin-env'
import type { EndpointResponse } from '../types'
import { QueryManageMedia, QueryMediaIndex, QuerySaveMedia } from './queries'
import { type TableMediaConfig, mediaTable } from './tables'
import { relativeMedia } from './utils'

export * from './utils'
export type { TableMediaConfig }

vars.register(() => [
  new EnvVar({ name: 'UNSPLASH_ACCESS_KEY', isOptional: true }),
])

type FictionMediaSettings = {
  fictionUser: FictionUser
  fictionDb: FictionDb
  fictionServer: FictionServer
  fictionAws: FictionAws
  awsBucketMedia: string
  unsplashAccessKey?: string
  cdnUrl?: string
} & FictionPluginSettings

export interface UploadConfig {
  mediaId?: string
  file?: File | Blob
  progress?: () => void
  formData?: FormData
}

export class FictionMedia extends FictionPlugin<FictionMediaSettings> {
  imageFieldName = 'imageFile'
  queries = {
    SaveMedia: new QuerySaveMedia({ fictionMedia: this, ...this.settings }),
    MediaIndex: new QueryMediaIndex({ fictionMedia: this, ...this.settings }),
    ManageMedia: new QueryManageMedia({ fictionMedia: this, ...this.settings }),
  }

  requests = this.createRequests({
    queries: this.queries,
    basePath: '/media',
    fictionServer: this.settings.fictionServer,
    fictionUser: this.settings.fictionUser,
    middleware: () => [multer().single(this.imageFieldName)],
  })

  cache: Record<string, TableMediaConfig> = {}

  constructor(settings: FictionMediaSettings) {
    super('FictionMedia', settings)

    this.settings.fictionDb?.addTables([mediaTable])

    this.settings.fictionEnv.cleanupCallbacks.push(() => {
      this.cache = {}
    })
  }

  async uploadFile(params: { file?: File, formData?: FormData }): Promise<EndpointResponse<TableMediaConfig>> {
    const { file, formData = new FormData() } = params

    if (file)
      formData.append(this.imageFieldName, file)

    const r = await this.requests.SaveMedia.upload({ data: formData })

    return r
  }

  async relativeMedia(args: { url: string, orgId?: string, userId?: string }): Promise<TableMediaConfig> {
    return await relativeMedia({
      fictionMedia: this,
      cache: this.cache,
      ...args,
    })
  }
}
