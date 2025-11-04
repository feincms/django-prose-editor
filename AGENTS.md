# Agent Notes for django-prose-editor

This document contains information for AI agents working on this project.

## Project Structure

- **Python/Django Backend**: Django app in `django_prose_editor/`
- **JavaScript/TypeScript Frontend**: Tiptap editor extensions in `src/`
- **Tests**: Python tests in `tests/`, uses Playwright for E2E tests
- **Documentation**: ReStructuredText files in `docs/`

## Running Tests

Use `tox` to run tests:

```bash
# Run tests with Python 3.13 and Django 5.2
tox -e py313-dj52
```

Tests include both unit tests and Playwright E2E tests. The test suite will automatically install Chromium if needed.

## JavaScript Development

The project uses:
- **Tiptap** for the rich text editor
- **rslib** for building JavaScript modules
- **prek** for linting and formatting (Rust-based pre-commit alternative, runs Biome and other tools)

JavaScript source files are in `src/` and get built into `django_prose_editor/static/`.

## Documentation

Documentation is written in ReStructuredText (`.rst`) format in the `docs/` directory.

When modifying extensions or features:
1. Update the relevant `.rst` file in `docs/`
2. Include code examples in both Python and JavaScript
3. Document configuration options, usage patterns, and HTML output

## Code Organization

### Tiptap Extensions

- Extensions are in `src/`
- Each extension typically exports a Tiptap extension object
- Extensions can add attributes to nodes/marks using `addGlobalAttributes()`
- Menu items are added via `addMenuItems({ buttons, menu })`

### Key Patterns

**Distinguishing Nodes vs Marks:**
```javascript
const isNodeType = (editor, typeName) => {
  return !!editor.state.schema.nodes[typeName]
}
```

**Getting Applicable Items:**
- For nodes: Walk up the document tree from the selection
- For marks: Check marks at the current selection position

**Menu Items:**
- Use `active()` to determine if option should be highlighted
- Use `hidden()` to determine if option should be shown
- For marks: Hide when selection is empty or mark type not active
- For nodes: Hide when node type is not in ancestor chain

## Testing Workflow

1. Make code changes
2. Run linting/formatting: `prek run --all-files` (or let it run on commit)
3. Run tests: `tox -e py313-dj52`
4. Verify all tests pass (32 tests expected)
5. Update documentation if needed

## Common Tasks

### Adding Support for Both Nodes and Marks

When an extension needs to support both nodes and marks:

1. Use a single configuration object (e.g., `cssClasses`)
2. Check the schema at runtime to determine if type is node or mark
3. Handle nodes with `setNodeAttribute()` and transactions
4. Handle marks with `setMark()` and `isActive()`
5. Update menu `hidden()` logic appropriately for each type

### Configuration Options

Extensions are configured in two ways:
- **Python**: Via `ProseEditorField(extensions={...})`
- **JavaScript**: Via `Extension.configure({...})`

Keep both configuration methods documented and in sync.
