import { Image as BaseImage } from "@tiptap/extension-image"

export const Image = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Reference to the file chosen through the Figure file picker
      file: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-file"),
        renderHTML: (attributes) =>
          attributes.file ? { "data-file": attributes.file } : {},
      },
    }
  },
})
