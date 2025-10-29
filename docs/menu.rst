Menu configuration
==================

Menu items are defined as follows:

.. code-block:: javascript

    menu.defineItem({
      name: "name",
      groups: "group1 group2 group3",
      // Higher priorities are sorted first
      priority: 100,
      // Apply the command:
      command(editor) {},
      // Is the item enabled?
      enabled(editor) { return true },
      // Should the item be shown as active, e.g. because the selection is inside
      // a node or mark of this particular type?
      active(editor) { return false },
      // Should this item be dynamically hidden?
      hidden(editor) { return false },
      // Run arbitrary updates
      update(editor) {}

      // Button: Element when shown in toolbar
      button: HTMLElement,
      // Option: Element when shown in dropdown
      option: HTMLElement | null,
    })

Most of these are optional; the keys without which a menu item definition
doesn't make much sense are ``name``, ``groups``, ``command`` and ``button``.

Creating Custom Menus
----------------------

Menu items can be organized and displayed using button groups and dropdowns:

.. code-block:: javascript

    // Return a button group
    const group = menu.buttonGroup({ editor, buttons }, menu.items("blockType"))

    // Return a dropdown
    const dropdown = menu.dropdown({ editor, buttons }, menu.items("formats"))

    // Create a group from all node menu items except those also contained in
    // blockType:
    const group = menu.buttonGroup({ editor, buttons }, menu.items("nodes -blockType"))

Defining button groups and dropdowns
------------------------------------

The Menu extension accepts a ``groups`` option which allows defining the menu
structure. The default is:

.. code-block:: javascript

    const defaultGroups = [
      { group: "blockType -lists", type: "dropdown", minItems: 2 },
      { group: "lists" },
      { group: "nodes -blockType -lists" },
      { group: "marks" },
      { group: "nodeClass", type: "dropdown" },
      { group: "textClass", type: "dropdown" },
      { group: "link" },
      { group: "textAlign" },
      { group: "table" },
      { group: "history" },
      { group: "utility" },
    ]

The same default value is available at
``django_prose_editor.config.DEFAULT_MENU_GROUPS``.

Menu Creator Functions
----------------------

If you need more control, you can use the menu creator function. The Menu
extension accepts an ``items`` option which should be a function that creates
the complete menu structure. This function receives ``{ editor, buttons, menu
}`` and should return an array of DOM elements:

.. code-block:: javascript

    // Create a custom menu layout
    function createMenu({ editor, buttons, menu }) {
        return [
            // Dropdown for block types (headings, lists, etc.)
            menu.dropdown({ editor, buttons }, menu.items("blockType -lists")),
            // Button group for lists
            menu.buttonGroup({ editor, buttons }, menu.items("lists")),
            // Button group for other nodes
            menu.buttonGroup({ editor, buttons }, menu.items("nodes -blockType -lists")),
            // Button group for text formatting
            menu.buttonGroup({ editor, buttons }, menu.items("marks")),
            // Dropdown for text classes
            menu.dropdown({ editor, buttons }, menu.items("textClass")),
            // Button group for links
            menu.buttonGroup({ editor, buttons }, menu.items("link")),
            // Button group for text alignment
            menu.buttonGroup({ editor, buttons }, menu.items("textAlign")),
            // Button group for tables
            menu.buttonGroup({ editor, buttons }, menu.items("table")),
            // Button group for history
            menu.buttonGroup({ editor, buttons }, menu.items("history")),
            // Button group for utilities
            menu.buttonGroup({ editor, buttons }, menu.items("utility")),
        ]
    }

    // Configure the menu to use your custom layout
    Menu.configure({
        items: createMenu,
    })

Using the Groups Helper
-----------------------

For convenience, there's a ``createMenuFromGroups`` helper that converts a simple groups configuration into a menu creator function:

.. code-block:: javascript

    import { createMenuFromGroups } from "django-prose-editor/menu"

    // Define your menu structure using groups
    const menuCreator = createMenuFromGroups([
        { group: "blockType -lists", type: "dropdown", minItems: 2 },
        { group: "lists" },
        { group: "nodes -blockType -lists" },
        { group: "marks" },
        { group: "textClass", type: "dropdown" },
        { group: "link" },
        { group: "textAlign" },
        { group: "table" },
        { group: "history" },
        { group: "utility" },
    ])

    // Use it with the Menu extension
    Menu.configure({
        items: menuCreator,
    })

This helper creates button groups by default, but you can specify ``type:
"dropdown"`` to create dropdowns instead. Also, ``minItems: 2`` in this example
only adds the block type dropdown if the dropdown would have at least two items.
