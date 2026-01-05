import { promises as fs } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import { defineConfig } from "@rslib/core"

const require = createRequire(import.meta.url)
const isProduction = process.env.NODE_ENV === "production"

async function removeZeroSizedFiles(distPath) {
  try {
    const files = await fs.readdir(distPath, { withFileTypes: true })

    for (const file of files) {
      if (file.isFile()) {
        const filePath = join(distPath, file.name)
        const stats = await fs.stat(filePath)
        if (stats.size === 0) {
          await fs.unlink(filePath)
          console.log(`Removed zero-sized file: ${filePath}`)
        }
      }
    }
  } catch (error) {
    console.error(`Error removing zero-sized files: ${error.message}`)
  }
}

const commonConfig = {
  autoExternal: false,
  bundle: true,
  format: "esm",
  experiments: {
    advancedEsm: false,
  },
  syntax: "es6",
  output: {
    distPath: {
      root: "django_prose_editor/static/django_prose_editor/",
      css: "",
      js: "",
      font: "",
    },
    filename: {
      js: "[name].js",
      css: "[name].css",
    },
    sourceMap: true,
    minify: isProduction,
    target: "web",
  },
}

export default defineConfig({
  lib: [
    {
      ...commonConfig,
      source: {
        entry: {
          editor: "./src/editor.js",
          overrides: "./src/overrides.css",
          "material-icons": "./src/material-icons.css",
        },
      },
    },
    // Editor presets
    {
      ...commonConfig,
      source: {
        entry: {
          default: "./src/default.js",
          configurable: "./src/configurable.js",
        },
      },
      output: {
        ...commonConfig.output,
        externals: {
          "django-prose-editor/editor": "module django-prose-editor/editor",
        },
        chunkLoading: "import",
      },
    },
  ],
  tools: {
    postcss: (opts) => {
      opts.postcssOptions.plugins = [require("autoprefixer")()]
    },
    rspack: {
      plugins: [
        {
          apply: (compiler) => {
            compiler.hooks.afterDone.tap(
              "RemoveZeroSizedFilesPlugin",
              async () => {
                await removeZeroSizedFiles(commonConfig.output.distPath.root)
              },
            )
          },
        },
      ],
    },
  },
})
