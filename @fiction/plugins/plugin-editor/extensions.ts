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

import GlobalDragHandle from 'tiptap-extension-global-drag-handle'

import AutoJoiner from 'tiptap-extension-auto-joiner'

import UpdatedImage from './imageUpdated'

const PlaceholderExtension = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === 'heading')
      return `Heading ${node.attrs.level}`

    return 'Press \'/\' for commands'
  },
  includeChildren: true,
})

const simpleExtensions = [

] as const

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
})

//
// InputRule,
// simpleExtensions,

export const extensions = [
  StarterKit,
  BubbleMenu,
  PlaceholderExtension,
  Horizontal,
  TiptapLink,
  TiptapImage,
  UpdatedImage,
  TaskItem,
  TaskList,
  TiptapUnderline,
  Superscript,
  Subscript,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  // Markdown.configure({ html: false, transformCopiedText: true }),
  GlobalDragHandle.configure({ scrollTreshold: 0 }),
  AutoJoiner,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    defaultAlignment: 'left',
    alignments: ['left', 'center', 'right', 'justify'],
  }),
]
