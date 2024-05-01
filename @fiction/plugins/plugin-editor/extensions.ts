import StarterKit from '@tiptap/starter-kit'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import TiptapLink from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TiptapUnderline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import { InputRule } from '@tiptap/core'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import BubbleMenu from '@tiptap/extension-bubble-menu'
import AutoJoiner from 'tiptap-extension-auto-joiner'
import Focus from '@tiptap/extension-focus'
import { PluginKey } from '@tiptap/pm/state'
import { ImageSelector } from './extensionImageAdd'
// import DropCursor from '@tiptap/extension-dropcursor'
// import FloatingMenu from '@tiptap/extension-floating-menu'

// import GlobalDragHandle from 'tiptap-extension-global-drag-handle'
import DragHandle from './extensionsDragHandle'
import SlashCommand from './extensionsSlash'

const PlaceholderExtension = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === 'heading')
      return `Heading ${node.attrs.level}`

    return 'Press \'/\' for commands, or \'++\' for AI autocomplete...'
  },
  includeChildren: true,
})

const Horizontal = HorizontalRule.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/u,
        handler: ({ state, range }) => {
          const attributes = {}

          const { tr } = state
          const start = range.from
          const end = range.to

          tr.insert(start - 1, this.type.create(attributes)).delete(
            tr.mapping.map(start),
            tr.mapping.map(end),
          )
        },
      }),
    ]
  },
}).configure({
  HTMLAttributes: {
    class: 'mt-4 mb-6 border-t border-theme-300 dark:border-theme-700',
  },
})

export const extensions = [
  ImageSelector,
  StarterKit.configure({
    horizontalRule: false,
    dropcursor: {
      color: '#3452ff',
      width: 4,
      class: 'rounded-lg opacity-40',
    },
  }),
  BubbleMenu.configure({
    pluginKey: new PluginKey('bubbleMenuText'),
    element: document.querySelector('.bubble-menu-text') as HTMLElement | undefined | null,
  }),
  PlaceholderExtension,
  Horizontal,
  TiptapLink,
  TiptapImage,
  TaskList.configure({
    HTMLAttributes: {
      class: 'not-prose pl-2',
    },
  }),
  TaskItem.configure({
    HTMLAttributes: {
      class: 'flex items-start my-4',
    },
    nested: true,
  }),
  TiptapUnderline,
  Superscript,
  Subscript,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  // Markdown.configure({ html: false, transformCopiedText: true }),
  AutoJoiner,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    defaultAlignment: 'left',
    alignments: ['left', 'center', 'right', 'justify'],
  }),
  SlashCommand,
  DragHandle,
  Focus,
]