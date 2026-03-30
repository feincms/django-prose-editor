import * as editorModule from "django-prose-editor/editor"
import {
  createTextareaEditor,
  initializeEditors,
} from "django-prose-editor/editor"

const marker = "data-django-prose-editor-configurable"

const EXTENSIONS = { ...editorModule }

const moduleLoadPromises = new Map()

async function loadExtensionModules(moduleUrls) {
  if (!moduleUrls?.length) return

  const loadPromises = moduleUrls.map((url) => {
    if (moduleLoadPromises.has(url)) {
      return moduleLoadPromises.get(url)
    }

    const loadPromise = import(url)
      .then((module) => {
        Object.assign(EXTENSIONS, module)
      })
      .catch((error) => {
        console.error(`Error loading extension module from ${url}:`, error)
        // Remove failed modules from cache
        moduleLoadPromises.delete(url)
      })

    moduleLoadPromises.set(url, loadPromise)
    return loadPromise
  })

  // Wait for all modules to load
  await Promise.all(loadPromises)
}

async function createEditorAsync(textarea, config = null) {
  if (textarea.closest(".prose-editor")) return null

  config = config || JSON.parse(textarea.getAttribute(marker) || "{}")

  if (config.js_modules?.length) {
    await loadExtensionModules(config.js_modules)
  }

  const extensions = []

  // Process all extensions from the config
  for (const [extensionName, extensionConfig] of Object.entries(
    config.extensions,
  )) {
    const extension = EXTENSIONS[extensionName]
    if (extension) {
      // If the extension has a configuration object (not empty), pass it to the extension
      if (typeof extensionConfig === "object") {
        extensions.push(extension.configure(extensionConfig))
      } else {
        extensions.push(extension)
      }
    }
  }

  return createTextareaEditor(textarea, extensions)
}

// Track pending editor initializations
const pendingEditors = new WeakMap()

// Function for the initializeEditors callback
function createEditor(textarea, config = null) {
  // Check if we already have a pending initialization for this textarea
  if (pendingEditors.has(textarea)) {
    return pendingEditors.get(textarea)
  }

  // Create a promise for the editor initialization
  const editorPromise = createEditorAsync(textarea, config)
    .then((editor) => {
      // The editor is initialized and ready to use
      if (editor) {
        const event = new CustomEvent("prose-editor:ready", {
          detail: { editor, textarea },
          bubbles: true,
        })
        textarea.dispatchEvent(event)
      }
      // Remove from pending tracking once complete
      pendingEditors.delete(textarea)
      return editor
    })
    .catch((error) => {
      console.error("Error initializing prose editor:", error)
      // Remove from pending tracking on error
      pendingEditors.delete(textarea)
      return null
    })

  // Track this pending initialization
  pendingEditors.set(textarea, editorPromise)

  // Return the promise
  return editorPromise
}

// Initialize all editors with the configurable marker
initializeEditors(createEditor, `[${marker}]`)

// Export utility functions for external use
export { createEditor }
