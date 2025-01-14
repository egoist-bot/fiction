import { BlogPost } from "@factor/plugin-blog-engine/types"

export const posts = [
  new BlogPost({
    key: "version3",
    permalink: "factorjs-version-3-released",
    publishDate: "2021-9-5",
    status: "published",
    type: ["release"],
    fileImport: (): Promise<any> => import("./content/v3post/post.md"),
    imageImport: (): Promise<any> => import("./content/v3post/image.jpg"),
  }),
]
