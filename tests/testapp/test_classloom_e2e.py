import re

import pytest
from playwright.sync_api import expect

from testapp.e2e_utils import login
from testapp.models import ClassLoomProseEditorModel


ADMIN_URL = "/admin/testapp/classloomproseeditormodel/"

GROUP_PARA_COLORS = "classLoom:paragraphColors"
GROUP_TABLE_LAYOUT = "classLoom:tableLayout"


def _btn(page, group_ident, class_name):
    """Return the ClassLoom button for a given group and class (or 'default')."""
    return page.locator(f"[data-name='{group_ident}:{class_name}']")


def _insert_table(page):
    """Insert a table and click into a cell."""
    page.locator(".prose-menubar__button[title='Insert table']").click()
    dialog = page.locator(".prose-editor-dialog")
    dialog.wait_for(state="visible", timeout=5000)
    dialog.locator("button[type='submit']").click()
    editor = page.locator(".prose-editor > .ProseMirror")
    editor.locator("table td").first.wait_for(state="visible", timeout=5000)
    editor.locator("table td").first.click()


# --- Extension loading / button visibility ---


@pytest.mark.django_db
@pytest.mark.e2e
def test_classloom_extension_and_buttons_visible(live_server, page):
    """ClassLoom extension loads and all group buttons appear in the toolbar."""
    login(page, live_server)
    page.goto(f"{live_server.url}{ADMIN_URL}add/")

    expect(page.locator(".prose-editor")).to_be_visible()

    for cls in ["default", "color-red", "color-blue", "color-green"]:
        expect(_btn(page, GROUP_PARA_COLORS, cls)).to_be_visible()
    for cls in ["default", "table--auto", "table--no-borders"]:
        expect(_btn(page, GROUP_TABLE_LAYOUT, cls)).to_be_visible()


# --- Paragraph colors (non-combinable) ---


@pytest.mark.django_db
@pytest.mark.e2e
def test_classloom_paragraph_color_apply(live_server, page):
    """Non-combinable: applying a color class adds it to the paragraph element."""
    login(page, live_server)
    page.goto(f"{live_server.url}{ADMIN_URL}add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Colorful paragraph")

    _btn(page, GROUP_PARA_COLORS, "color-red").click()

    expect(_btn(page, GROUP_PARA_COLORS, "color-red")).to_have_class(
        re.compile(r"\bactive\b")
    )
    expect(editor.locator("p.color-red")).to_have_text("Colorful paragraph")

    page.click("input[name='_save']")

    model = ClassLoomProseEditorModel.objects.first()
    assert model is not None
    assert 'class="color-red"' in model.description
    assert "Colorful paragraph" in model.description


@pytest.mark.django_db
@pytest.mark.e2e
def test_classloom_paragraph_color_switch(live_server, page):
    """Non-combinable: selecting a second color replaces the first one."""
    login(page, live_server)
    page.goto(f"{live_server.url}{ADMIN_URL}add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Switching colors")

    _btn(page, GROUP_PARA_COLORS, "color-red").click()
    _btn(page, GROUP_PARA_COLORS, "color-blue").click()

    expect(_btn(page, GROUP_PARA_COLORS, "color-blue")).to_have_class(
        re.compile(r"\bactive\b")
    )
    expect(_btn(page, GROUP_PARA_COLORS, "color-red")).not_to_have_class(
        re.compile(r"\bactive\b")
    )
    expect(editor.locator("p.color-blue")).to_have_text("Switching colors")
    expect(editor.locator("p.color-red")).to_have_count(0)

    page.click("input[name='_save']")

    model = ClassLoomProseEditorModel.objects.first()
    assert model is not None
    assert 'class="color-blue"' in model.description
    assert "color-red" not in model.description


@pytest.mark.django_db
@pytest.mark.e2e
def test_classloom_paragraph_color_remove(live_server, page):
    """Non-combinable: the default button removes the class from the paragraph."""
    login(page, live_server)
    page.goto(f"{live_server.url}{ADMIN_URL}add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Remove color")

    _btn(page, GROUP_PARA_COLORS, "color-green").click()
    expect(editor.locator("p.color-green")).to_have_text("Remove color")

    _btn(page, GROUP_PARA_COLORS, "default").click()

    expect(_btn(page, GROUP_PARA_COLORS, "default")).to_have_class(
        re.compile(r"\bactive\b")
    )
    expect(editor.locator("p.color-green")).to_have_count(0)

    page.click("input[name='_save']")

    model = ClassLoomProseEditorModel.objects.first()
    assert model is not None
    assert "class=" not in model.description
    assert "Remove color" in model.description


# --- Table layout (combinable) ---


@pytest.mark.django_db
@pytest.mark.e2e
def test_classloom_table_combinable_apply_multiple(live_server, page):
    """Combinable: multiple classes from the same group can coexist on a table."""
    login(page, live_server)
    page.goto(f"{live_server.url}{ADMIN_URL}add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    _insert_table(page)

    _btn(page, GROUP_TABLE_LAYOUT, "table--auto").click()
    _btn(page, GROUP_TABLE_LAYOUT, "table--no-borders").click()

    expect(_btn(page, GROUP_TABLE_LAYOUT, "table--auto")).to_have_class(
        re.compile(r"\bactive\b")
    )
    expect(_btn(page, GROUP_TABLE_LAYOUT, "table--no-borders")).to_have_class(
        re.compile(r"\bactive\b")
    )
    expect(editor.locator("table.table--auto.table--no-borders")).to_have_count(1)

    page.click("input[name='_save']")

    model = ClassLoomProseEditorModel.objects.first()
    assert model is not None
    # Classes are sorted alphabetically by classloom.js.
    assert 'class="table--auto table--no-borders"' in model.description


@pytest.mark.django_db
@pytest.mark.e2e
def test_classloom_table_combinable_toggle_off_one(live_server, page):
    """Combinable: clicking an active class removes only that class."""
    login(page, live_server)
    page.goto(f"{live_server.url}{ADMIN_URL}add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    _insert_table(page)

    _btn(page, GROUP_TABLE_LAYOUT, "table--auto").click()
    _btn(page, GROUP_TABLE_LAYOUT, "table--no-borders").click()
    # Click table--auto again to toggle it off.
    _btn(page, GROUP_TABLE_LAYOUT, "table--auto").click()

    expect(_btn(page, GROUP_TABLE_LAYOUT, "table--auto")).not_to_have_class(
        re.compile(r"\bactive\b")
    )
    expect(_btn(page, GROUP_TABLE_LAYOUT, "table--no-borders")).to_have_class(
        re.compile(r"\bactive\b")
    )
    expect(editor.locator("table.table--no-borders")).to_have_count(1)
    expect(editor.locator("table.table--auto")).to_have_count(0)

    page.click("input[name='_save']")

    model = ClassLoomProseEditorModel.objects.first()
    assert model is not None
    assert "table--no-borders" in model.description
    assert "table--auto" not in model.description


@pytest.mark.django_db
@pytest.mark.e2e
def test_classloom_table_combinable_clear_all(live_server, page):
    """Combinable: the default button removes all classes from the group."""
    login(page, live_server)
    page.goto(f"{live_server.url}{ADMIN_URL}add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    _insert_table(page)

    _btn(page, GROUP_TABLE_LAYOUT, "table--auto").click()
    _btn(page, GROUP_TABLE_LAYOUT, "table--no-borders").click()
    expect(editor.locator("table.table--auto.table--no-borders")).to_have_count(1)

    _btn(page, GROUP_TABLE_LAYOUT, "default").click()

    expect(_btn(page, GROUP_TABLE_LAYOUT, "default")).to_have_class(
        re.compile(r"\bactive\b")
    )
    expect(editor.locator("table.table--auto")).to_have_count(0)
    expect(editor.locator("table.table--no-borders")).to_have_count(0)

    page.click("input[name='_save']")

    model = ClassLoomProseEditorModel.objects.first()
    assert model is not None
    assert "table--auto" not in model.description
    assert "table--no-borders" not in model.description
