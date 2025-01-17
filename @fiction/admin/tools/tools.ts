import type { ActionItem, ClickHandler, colorTheme } from '@fiction/core'
import { FictionObject, onResetUi, vue } from '@fiction/core'

export type Handle = {
  handleId: string
  title: string
  sub?: string
  depth: number
  icon?: string
  colorTheme?: typeof colorTheme[number]
  isDraggable?: boolean
  hasDrawer?: boolean
  handles?: Handle[]
  onClick?: ClickHandler
  actions?: ActionItem[]
  isActive?: boolean
}

export type EditorTool<T extends string = string, U extends Record<string, any> = Record<string, any>> = {
  toolId: T
  title?: string
  icon: string
  el?: vue.Component
  isPrimary?: boolean
  isDefault?: boolean
  location?: 'primary' | 'context'
  props?: (args: U) => vue.ComputedRef<Record<string, unknown>>
  widthClasses?: string
}

type AdminEditorControllerSettings = {
  tools: readonly EditorTool[]
}

export class AdminEditorController extends FictionObject<AdminEditorControllerSettings> {
  tools = this.settings.tools

  constructor(settings: AdminEditorControllerSettings) {
    super('AdminEditorController', settings)

    onResetUi((args) => {
      if (args.scope === 'iframe')
        this.useTool({ toolId: '' })
    })
  }

  activeToolId = {
    primary: vue.ref<string>(),
    context: vue.ref<string>(),
  }

  defaultTool = {
    context: vue.computed(() => this.settings.tools.find(t => t.isDefault && t.location === 'context')?.toolId),
  }

  activeTool = {
    primary: vue.computed(() => this.settings.tools.find(t => t.toolId === this.activeToolId.primary.value)),
    context: vue.computed(() => this.settings.tools.find(t => t.toolId === (this.activeToolId.context.value ? this.activeToolId.context.value : this.defaultTool.context.value))),
  }

  isUsingTool(args: { toolId?: string, locations?: ('primary' | 'context')[] } = {}) {
    const { toolId, locations = ['primary', 'context'] } = args
    return locations.some(l => this.activeToolId[l].value === toolId)
  }

  useTool(args: { toolId: string }) {
    const { toolId } = args
    const t = this.settings.tools.find(t => t.toolId === toolId)
    const location = t?.location || 'primary'
    this.activeToolId[location].value = toolId
  }
}
