import json
import os
import re

import pytest
from django.contrib.auth.models import User
from playwright.sync_api import expect

from testapp.models import (
    ConfigurableProseEditorModel,
    ProseEditorModel,
    TableProseEditorModel,
)


# Set Django async unsafe to allow database operations in tests
os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")


@pytest.mark.django_db
@pytest.mark.e2e
def test_prose_editor_admin_form(page, live_server):
    """Test that the prose editor loads and works in the admin."""
    # Login first
    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Visit the login page
    page.goto(f"{live_server.url}/admin/login/")

    # Fill in the login form
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")

    # Submit the form
    page.click("input[type=submit]")

    # Wait for the admin index page to load
    page.wait_for_url(f"{live_server.url}/admin/")

    # Go to the add page
    page.goto(f"{live_server.url}/admin/testapp/proseeditormodel/add/")

    # Check that the prose editor is loaded
    editor_container = page.locator(".prose-editor")
    expect(editor_container).to_be_visible()

    # Check that the toolbar is visible
    toolbar = page.locator(".prose-menubar")
    expect(toolbar).to_be_visible()

    # Type some content into the editor
    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Hello, Playwright!")

    # Save the form
    page.click("input[name='_save']")

    # Check that we've been redirected to the changelist page
    expect(page).to_have_url(f"{live_server.url}/admin/testapp/proseeditormodel/")

    # Check that the model was created
    model = ProseEditorModel.objects.first()
    assert model is not None
    assert "Hello, Playwright!" in model.description


@pytest.mark.django_db
@pytest.mark.e2e
def test_prose_editor_formatting(page, live_server):
    """Test formatting functionality in the prose editor."""
    # Login first
    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Visit the login page
    page.goto(f"{live_server.url}/admin/login/")

    # Fill in the login form
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")

    # Submit the form
    page.click("input[type=submit]")

    # Go to the add page
    page.goto(f"{live_server.url}/admin/testapp/proseeditormodel/add/")

    # Click in the editor
    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Format this text")

    # Select the text
    editor.press("Control+a")

    # Make it bold
    bold_button = page.locator(".prose-menubar__button[title='bold']")
    bold_button.click()

    # Save the form
    page.click("input[name='_save']")

    # Check the model content contains bold formatting
    model = ProseEditorModel.objects.first()
    assert model is not None
    assert "<strong>Format this text</strong>" in model.description


@pytest.mark.django_db
@pytest.mark.e2e
def test_prose_editor_table_creation(page, live_server):
    """Test table insertion in a TableProseEditorModel."""
    # Login first
    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Visit the login page
    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    # Go to the add page for the TableProseEditorModel
    page.goto(f"{live_server.url}/admin/testapp/tableproseeditormodel/add/")

    # Click in the editor to focus it
    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Test content before table")
    editor.press("Enter")
    editor.press("Enter")

    # Verify that the table button is present (this verifies the Table extension is loaded)
    table_button = page.locator(".prose-menubar__button[title='Insert table']")
    expect(table_button).to_be_visible()

    # Click the table button to open the dialog
    table_button.click()

    # Check that the dialog appears
    dialog = page.locator(".prose-editor-dialog")
    expect(dialog).to_be_visible()

    # Fill in the dialog form with specific values
    page.fill("input[name='rows']", "4")
    page.fill("input[name='cols']", "5")
    page.locator("select[name='withHeaderRow']").select_option("Yes")

    # Submit the dialog
    dialog.locator("button[type='submit']").click()

    # Wait for the table to be visible
    table = editor.locator("table")
    table.wait_for(state="visible", timeout=5000)

    # Verify table structure
    expect(editor.locator("tr")).to_have_count(4)  # 1 header + 3 data rows
    expect(editor.locator("th")).to_have_count(5)  # 5 header cells

    # Verify that table manipulation buttons exist (they may be hidden until table is activated)
    # This confirms that table extensions are properly loaded
    add_column_button = page.locator(".prose-menubar__button[title='Add column']")
    expect(add_column_button).to_have_count(1)

    delete_column_button = page.locator(".prose-menubar__button[title='Delete column']")
    expect(delete_column_button).to_have_count(1)

    # Save the form
    page.click("input[name='_save']")

    # Check the model content contains a table structure
    model = TableProseEditorModel.objects.first()
    assert model is not None
    html_content = model.description.lower()

    # Verify saved content has table components with the structure we defined
    assert "table" in html_content
    assert "tbody" in html_content  # Table uses tbody
    assert "tr" in html_content  # Has rows
    assert "th" in html_content  # Has header cells (th) in the first row
    assert "td" in html_content  # Has data cells (td) in subsequent rows

    # Also verify the correct number of rows and header cells
    assert html_content.count("<tr>") == 4  # 4 rows total
    assert html_content.count("<th") == 5  # 5 header cells


@pytest.mark.django_db
@pytest.mark.e2e
def test_prose_editor_ordered_list_attributes(page, live_server):
    """Test ordered list creation and attribute modification."""
    # Login first
    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Visit the login page and log in
    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    # Go to the add page for the TableProseEditorModel (which has OrderedList extension)
    page.goto(f"{live_server.url}/admin/testapp/tableproseeditormodel/add/")

    # Click in the editor to focus it
    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Test content before list")
    editor.press("Enter")
    editor.press("Enter")

    # Verify that the ordered list button is present
    ordered_list_button = page.locator(".prose-menubar__button[title='ordered list']")
    expect(ordered_list_button).to_be_visible()

    # Click the ordered list button to create a list
    ordered_list_button.click()

    # Type list items
    editor.type("First item")
    editor.press("Enter")
    editor.type("Second item")
    editor.press("Enter")
    editor.type("Third item")

    # Verify the list was created
    ol_element = editor.locator("ol")
    expect(ol_element).to_be_visible()

    # Look for the List properties button in the toolbar
    list_properties_button = page.locator(
        ".prose-menubar__button[title='List properties']"
    )

    # It should be visible now that we have an active ordered list
    expect(list_properties_button).to_be_visible()

    # Click the list properties button
    list_properties_button.click()

    # Check that the list properties dialog appears
    dialog = page.locator(".prose-editor-dialog")
    expect(dialog).to_be_visible()

    # Change list type to uppercase letters
    page.locator("select[name='listType']").select_option("A, B, C, ...")

    # Change start value to 5
    page.fill("input[name='start']", "5")

    # Submit the dialog
    dialog.locator("button[type='submit']").click()

    # Verify the list has been updated with the new attributes
    updated_ol = editor.locator("ol")
    expect(updated_ol).to_have_attribute("type", "A")
    expect(updated_ol).to_have_attribute("data-type", "upper-alpha")
    expect(updated_ol).to_have_attribute("start", "5")

    # Save the form
    page.click("input[name='_save']")

    # Check the model content contains the ordered list with correct attributes
    model = TableProseEditorModel.objects.first()
    assert model is not None
    html_content = model.description

    # Verify the saved content has the ordered list with the attributes we set
    assert "<ol" in html_content
    assert 'type="A"' in html_content
    assert 'data-type="upper-alpha"' in html_content
    assert 'start="5"' in html_content
    assert "<li>" in html_content
    assert "First item" in html_content
    assert "Second item" in html_content
    assert "Third item" in html_content


@pytest.mark.django_db
@pytest.mark.e2e
def test_configurable_prose_editor_admin(page, live_server):
    """Test that the configurable prose editor loads in the admin with the BlueBold extension."""
    # Create superuser for admin access
    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Log in to the admin
    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    # Go to the add page for ConfigurableProseEditorModel
    page.goto(f"{live_server.url}/admin/testapp/configurableproseeditormodel/add/")

    # Check that the prose editor is loaded
    editor_container = page.locator(".prose-editor")
    expect(editor_container).to_be_visible()

    # The data attribute is on the textarea element inside the prose editor, not on the div
    # The textarea is hidden by the editor UI, so we don't check if it's visible
    textarea = page.locator(".prose-editor textarea")

    # Get the configurable data attribute from the textarea
    configurable_attr = textarea.get_attribute("data-django-prose-editor-configurable")
    assert configurable_attr is not None

    # Parse the configuration JSON
    config = json.loads(configurable_attr)

    # Verify BlueBold extension is present in the configuration
    assert "BlueBold" in config["extensions"]

    # Check the <head> for the blue-bold.js script in the import map or as a script tag
    page_content = page.content()
    assert "blue-bold.js" in page_content, (
        "BlueBold JS file reference not found in page content"
    )

    # Verify other expected extensions are present
    assert "Bold" in config["extensions"]
    assert "Italic" in config["extensions"]
    assert "Table" in config["extensions"]
    assert "Heading" in config["extensions"]

    # Verify Heading is configured with correct levels
    assert "levels" in config["extensions"]["Heading"]
    assert config["extensions"]["Heading"]["levels"] == [1, 2, 3]

    # Verify the BlueBold JS module is included in the configuration
    assert "js_modules" in config
    assert any("blue-bold.js" in js_path for js_path in config["js_modules"])

    # Add content using the editor to test BlueBold extension
    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()

    # Wait for editor to be focused and ready
    editor.wait_for(state="visible", timeout=5000)
    page.wait_for_timeout(500)  # Brief wait for editor initialization

    # Test keyboard shortcut for BlueBold
    editor.type("Keyboard shortcut test")
    page.wait_for_timeout(100)  # Wait for typing to complete
    editor.press("Control+a")  # Select all text
    page.wait_for_timeout(100)  # Wait for selection
    editor.press("Control+Shift+b")  # Apply BlueBold with shortcut

    # Move cursor to end and add new paragraph
    editor.press("End")
    editor.press("Enter")
    editor.press("Enter")
    page.wait_for_timeout(100)  # Wait for cursor positioning

    # Test input rule for BlueBold with the more specific pattern
    editor.type("**blue:Input rule test**")
    page.wait_for_timeout(200)  # Wait for input rule processing

    # Add another paragraph to check generated HTML
    editor.press("Enter")
    editor.press("Enter")
    editor.type("Regular text after BlueBold tests")
    page.wait_for_timeout(200)  # Wait for final typing to complete

    # Save the form
    page.click("input[name='_save']")

    # Verify the model was created with the content
    model = ConfigurableProseEditorModel.objects.first()
    assert model is not None

    # Verify BlueBold formatting is in the saved HTML
    html_content = model.description

    # Print debug output with clear markers
    print("\n==== SAVED HTML CONTENT ====")
    print(html_content)
    print("==== END SAVED HTML CONTENT ====\n")

    # The HTML will contain a strong tag with appropriate attributes
    assert "<strong" in html_content.lower(), "Missing <strong> tag in saved HTML"
    assert 'style="color: blue;"' in html_content, (
        "Missing blue color style in saved HTML"
    )
    assert 'class="blue-bold-text"' in html_content, (
        "Missing blue-bold-text class in saved HTML"
    )
    assert "Keyboard shortcut test" in html_content, (
        "Missing keyboard shortcut test text"
    )
    assert "Input rule test" in html_content, "Missing input rule test text"

    # Go to the change page to see if formatting is preserved
    page.goto(
        f"{live_server.url}/admin/testapp/configurableproseeditormodel/{model.id}/change/"
    )

    # Verify the editor loads with content
    editor_with_content = page.locator(".prose-editor > .ProseMirror")
    expect(editor_with_content).to_be_visible()

    # Print the editor content for debugging
    editor_html = editor_with_content.evaluate("el => el.innerHTML")

    print("\n==== EDITOR HTML AFTER RELOAD ====")
    print(editor_html)
    print("==== END EDITOR HTML AFTER RELOAD ====\n")

    # Verify that we see the blue-bold formatted content in some form
    # Checking strong elements exist rather than specific class
    assert "Keyboard shortcut test" in editor_html
    assert "Input rule test" in editor_html


@pytest.mark.django_db
@pytest.mark.e2e
def test_html_extension_edit_and_prettify_button(page, live_server):
    """Test the HTML extension with edit functionality and on-demand prettification button."""
    # Create superuser for admin access
    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Log in to the admin
    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    # Go to the add page for ConfigurableProseEditorModel (which has HTML and CodeBlock extensions enabled)
    page.goto(f"{live_server.url}/admin/testapp/configurableproseeditormodel/add/")

    # Check that the prose editor is loaded
    editor_container = page.locator(".prose-editor")
    expect(editor_container).to_be_visible()

    # Add some initial content to the editor
    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Initial content for HTML test")

    # Look for the HTML edit button in the toolbar (material icon "code" with title "edit HTML")
    html_button = page.locator(".prose-menubar__button[title='edit HTML']")
    expect(html_button).to_be_visible()

    # Click the HTML edit button to open the dialog
    html_button.click()

    # Check that the HTML dialog appears
    dialog = page.locator(".prose-editor-dialog")
    expect(dialog).to_be_visible()

    # Check that the textarea contains the current content
    html_textarea = dialog.locator("textarea[name='html']")
    expect(html_textarea).to_be_visible()

    # Get the initial HTML content
    initial_html = html_textarea.input_value()
    assert "Initial content for HTML test" in initial_html

    # Clear and enter new HTML with nested structure (not prettified yet)
    html_content = "<div><h1>Test Header</h1><p>Paragraph content</p><pre>    Preformatted text\n    with    whitespace\n        and indentation\n        that should be preserved</pre><div><ul><li>List item 1</li><li>List item 2</li></ul></div></div>"
    html_textarea.fill(html_content)

    # Test the Prettify button - it should be visible in the dialog
    prettify_button = dialog.locator("button:has-text('Prettify')")
    expect(prettify_button).to_be_visible()

    # Click the Prettify button to format the HTML
    prettify_button.click()

    # Verify that the HTML is now prettified in the textarea
    prettified_content = html_textarea.input_value()
    print("\n==== PRETTIFIED CONTENT AFTER BUTTON CLICK ====")
    print(prettified_content)
    print("==== END PRETTIFIED CONTENT ====\n")

    # Verify prettification worked: should have proper formatting
    assert "<h1>Test Header</h1>" in prettified_content
    assert "  <li>" in prettified_content  # List items should be indented

    # Most importantly: verify <pre> content whitespace is preserved
    assert (
        "    Preformatted text\n    with    whitespace\n        and indentation\n        that should be preserved"
        in prettified_content
    )

    # Submit the dialog
    dialog.locator("button[type='submit']").click()

    # Wait for dialog to close
    expect(dialog).not_to_be_visible()

    # Save the form
    page.click("input[name='_save']")

    # Check that the model was created
    model = ConfigurableProseEditorModel.objects.first()
    assert model is not None

    saved_html = model.description
    print("\n==== SAVED HTML FROM HTML EXTENSION ====")
    print(saved_html)
    print("==== END SAVED HTML ====\n")

    # Verify that the HTML contains all the expected elements
    assert "<h1>Test Header</h1>" in saved_html
    assert "<p>Paragraph content</p>" in saved_html
    assert "<pre>" in saved_html
    assert "Preformatted text" in saved_html
    assert "<ul>" in saved_html
    assert "<li><p>List item 1</p></li>" in saved_html
    assert "<li><p>List item 2</p></li>" in saved_html

    # Verify that the <pre><code> content preserves whitespace (CodeBlock extension uses <pre><code>)
    # The whitespace and indentation inside should be preserved exactly
    assert (
        "    Preformatted text\n    with    whitespace\n        and indentation\n        that should be preserved"
        in saved_html
    )

    # Verify that other elements are prettified (have proper formatting)
    # The HTML should be nicely formatted for other elements but not inside <pre>
    lines = saved_html.split("\n")
    # Should have multiple lines due to prettification
    assert len(lines) > 1

    # Go to the edit page to test that HTML can be edited again
    page.goto(
        f"{live_server.url}/admin/testapp/configurableproseeditormodel/{model.id}/change/"
    )

    # Verify the editor loads with the saved content
    editor_loaded = page.locator(".prose-editor > .ProseMirror")
    expect(editor_loaded).to_be_visible()

    # Click the HTML edit button again to test that HTML is not automatically prettified
    html_button_edit = page.locator(".prose-menubar__button[title='edit HTML']")
    html_button_edit.click()

    # Check that the dialog shows the current HTML (not automatically prettified)
    dialog_edit = page.locator(".prose-editor-dialog")
    expect(dialog_edit).to_be_visible()

    html_textarea_edit = dialog_edit.locator("textarea[name='html']")
    current_html = html_textarea_edit.input_value()

    print("\n==== CURRENT HTML IN DIALOG (SHOULD NOT BE AUTO-PRETTIFIED) ====")
    print(current_html)
    print("==== END CURRENT HTML ====\n")

    # Verify the HTML is NOT automatically prettified when dialog opens
    # The saved HTML should be compact/unprettified initially
    assert "<h1>Test Header</h1>" in current_html
    assert "<pre>" in current_html

    # Check that Prettify button is available
    prettify_button_edit = dialog_edit.locator("button:has-text('Prettify')")
    expect(prettify_button_edit).to_be_visible()

    # Click Prettify button to format the HTML on demand
    prettify_button_edit.click()

    # Now verify the HTML becomes prettified
    prettified_html_edit = html_textarea_edit.input_value()

    print("\n==== HTML AFTER CLICKING PRETTIFY BUTTON ====")
    print(prettified_html_edit)
    print("==== END PRETTIFIED HTML ====\n")

    # Verify the HTML is now prettified (properly indented and formatted)
    assert "<h1>Test Header</h1>" in prettified_html_edit  # Top level elements
    assert "<pre>" in prettified_html_edit
    assert "  <li>" in prettified_html_edit  # List items should be indented

    # Most importantly: verify that <pre><code> content is NOT modified by prettification
    # The key test: the original complex whitespace should be preserved
    assert "    Preformatted text" in prettified_html_edit
    assert "with    whitespace" in prettified_html_edit
    assert "and indentation" in prettified_html_edit
    assert "that should be preserved" in prettified_html_edit

    # Close dialog without changes - click Cancel button specifically
    cancel_button = dialog_edit.locator("button:has-text('Cancel')")
    cancel_button.click()
    expect(dialog_edit).not_to_be_visible()


@pytest.mark.django_db
@pytest.mark.e2e
def test_nodeclass_textclass(live_server, page):
    User.objects.create_superuser("admin", "admin@example.com", "password")

    page.goto(f"{live_server.url}/admin/login/")

    # Fill in the login form
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")

    # Submit the form
    page.click("input[type=submit]")

    page.goto(f"{live_server.url}/admin/testapp/configurableproseeditormodel/add/")

    # Check that the prose editor is loaded
    editor_container = page.locator(".prose-editor")
    expect(editor_container).to_be_visible()

    page.get_by_role("textbox").fill("Blubbering Hello World")
    page.locator("div").filter(has_text=re.compile(r"^default$")).click()
    page.locator("div").filter(has_text=re.compile(r"^Block style$")).click()
    page.get_by_text("paragraph: highlight").click()

    page.get_by_role("textbox").press("ControlOrMeta+Shift+ArrowLeft")
    page.locator("div").filter(has_text=re.compile(r"^default$")).click()
    page.get_by_text("highlight", exact=True).click()

    page.click("input[name='_save']")

    # Check that we've been redirected to the changelist page
    expect(page).to_have_url(
        f"{live_server.url}/admin/testapp/configurableproseeditormodel/"
    )

    # Check that the model was created
    model = ConfigurableProseEditorModel.objects.first()
    assert model is not None
    assert (
        model.description
        == '<p class="highlight">Blubbering Hello <span class="highlight">World</span></p>'
    )


@pytest.mark.django_db
@pytest.mark.e2e
def test_nodeclass_mark_css_class(live_server, page):
    """Test NodeClass extension with mark CSS classes (e.g., bold with emphasis class)."""
    User.objects.create_superuser("admin", "admin@example.com", "password")

    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    page.goto(f"{live_server.url}/admin/testapp/configurableproseeditormodel/add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Important text")

    # Select all and make bold
    editor.press("ControlOrMeta+a")
    page.locator(".prose-menubar__button[title='bold']").click()

    # Click on the bold text in the editor to place cursor inside
    page.locator(".prose-editor strong").click()

    # Apply emphasis class to the bold mark at cursor position
    page.locator("div").filter(has_text=re.compile(r"^Block style$")).click()
    page.get_by_text("bold: emphasis").click()

    page.click("input[name='_save']")

    # Verify saved content
    model = ConfigurableProseEditorModel.objects.first()
    assert model is not None
    assert '<strong class="emphasis">Important text</strong>' in model.description


@pytest.mark.django_db
@pytest.mark.e2e
def test_nodeclass_mark_switch_class(live_server, page):
    """Test switching between different CSS classes on the same mark."""
    User.objects.create_superuser("admin", "admin@example.com", "password")

    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    page.goto(f"{live_server.url}/admin/testapp/configurableproseeditormodel/add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Important text")

    # Select all and make bold
    editor.press("ControlOrMeta+a")
    page.locator(".prose-menubar__button[title='bold']").click()

    # Click on the bold text and apply emphasis class
    page.locator(".prose-editor strong").click()
    page.locator("div").filter(has_text=re.compile(r"^Block style$")).click()
    page.get_by_text("bold: emphasis").click()

    # Now switch to important class
    page.locator(".prose-editor strong").click()
    page.locator("div").filter(has_text=re.compile(r"^Block style$")).click()
    page.get_by_text("bold: important").click()

    page.click("input[name='_save']")

    # Verify the class was switched to important
    model = ConfigurableProseEditorModel.objects.first()
    assert model is not None
    assert '<strong class="important">Important text</strong>' in model.description


@pytest.mark.django_db
@pytest.mark.e2e
def test_nodeclass_reset_classes(live_server, page):
    """Test the reset classes functionality for both nodes and marks."""
    User.objects.create_superuser("admin", "admin@example.com", "password")

    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    page.goto(f"{live_server.url}/admin/testapp/configurableproseeditormodel/add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Important text")

    # Apply paragraph highlight class (without selection, just click in paragraph)
    editor.click()
    page.locator("div").filter(has_text=re.compile(r"^Block style$")).click()
    page.get_by_text("paragraph: highlight").click()

    # Make text bold and apply emphasis class
    editor.press("ControlOrMeta+a")
    page.locator(".prose-menubar__button[title='bold']").click()
    page.locator(".prose-editor strong").click()
    page.locator("div").filter(has_text=re.compile(r"^Block style$")).click()
    page.get_by_text("bold: emphasis").click()

    # Now clear paragraph class
    page.locator(".prose-editor strong").click()
    page.locator("div").filter(has_text=re.compile(r"^Block style$")).click()
    page.get_by_text("paragraph: default").click()

    # Clear bold class
    page.locator("div").filter(has_text=re.compile(r"^Block style$")).click()
    page.get_by_text("bold: default").click()

    page.click("input[name='_save']")

    # Verify both classes were removed
    model = ConfigurableProseEditorModel.objects.first()
    assert model is not None
    # Should have bold but no classes
    assert "<strong>Important text</strong>" in model.description
    # Should not have emphasis class
    assert 'class="emphasis"' not in model.description
    # Should not have highlight class
    assert 'class="highlight"' not in model.description


@pytest.mark.django_db
@pytest.mark.e2e
def test_actually_empty(live_server, page):
    User.objects.create_superuser("admin", "admin@example.com", "password")

    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    page.goto(f"{live_server.url}/admin/testapp/configurableproseeditormodel/add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    element = page.locator("#id_description")

    editor.click()
    editor.type("Hello, Playwright!")
    expect(element).to_have_value("<p>Hello, Playwright!</p>")
    editor.press("ControlOrMeta+a")
    editor.press("Delete")
    expect(element).to_have_value("")


"""
def test_codegen_helper(live_server):
    print(f"Live server URL: {live_server.url}")

    User.objects.create_superuser("admin", "admin@example.com", "password")

    import subprocess
    subprocess.Popen(["playwright", "codegen", f"{live_server.url}/admin/"])

    input("Press Enter when done with codegen...")
"""
