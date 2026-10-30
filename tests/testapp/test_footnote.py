import re

import pytest
from playwright.sync_api import expect

from django_prose_editor.config import allowlist_from_extensions
from testapp.e2e_utils import login, save
from testapp.models import FootnoteProseEditorModel


FOOTNOTE_HTML = (
    '<p>Claim<sup class="footnote-ref" id="fnref-abc" data-footnote-id="abc">'
    '<a href="#fn-abc">1</a></sup></p>'
    '<ol class="footnotes"><li id="fn-abc" data-footnote-id="abc">'
    '<span class="footnote-content">Source</span> '
    '<a class="footnote-backref" href="#fnref-abc">↩</a></li></ol>'
)


def test_footnote_allowlist():
    config = allowlist_from_extensions({"Footnote": True})
    assert {"sup", "a", "ol", "li", "span"} <= config["tags"]
    assert config["allowed_classes"]["sup"] == {"footnote-ref"}
    assert config["allowed_classes"]["ol"] == {"footnotes"}
    assert {"id", "data-footnote-id"} <= config["attributes"]["li"]


@pytest.mark.django_db
def test_footnote_sanitization_keeps_footnotes():
    field = FootnoteProseEditorModel._meta.get_field("description")
    cleaned = field.clean(FOOTNOTE_HTML, None)

    assert 'class="footnote-ref"' in cleaned
    assert 'id="fnref-abc"' in cleaned
    assert 'href="#fn-abc"' in cleaned
    assert '<ol class="footnotes">' in cleaned
    assert 'id="fn-abc"' in cleaned
    assert '<span class="footnote-content">Source</span>' in cleaned
    assert 'href="#fnref-abc"' in cleaned


@pytest.mark.django_db
def test_footnote_sanitization_strips_other_classes():
    field = FootnoteProseEditorModel._meta.get_field("description")
    cleaned = field.clean(
        '<p><span class="evil" onclick="x()">x</span></p>'
        '<ol class="evil"><li>y</li></ol>',
        None,
    )
    assert "evil" not in cleaned
    assert "onclick" not in cleaned


@pytest.mark.django_db
@pytest.mark.e2e
def test_footnote_e2e(page, live_server):
    login(page, live_server)
    page.goto(f"{live_server.url}/admin/testapp/footnoteproseeditormodel/add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    editor.click()
    editor.type("Some claim")

    page.locator(".prose-menubar__button[title='footnote']").click()
    # The cursor is now inside the new footnote
    page.keyboard.type("A source")

    expect(editor.locator("sup.footnote-ref")).to_have_text("1")
    expect(editor.locator("ol.footnotes li")).to_have_count(1)

    save(page)

    model = FootnoteProseEditorModel.objects.first()
    assert model is not None
    html = model.description

    ref = re.search(r'<sup class="footnote-ref" id="fnref-(\w+)"', html)
    assert ref, html
    fid = ref.group(1)
    assert f'href="#fn-{fid}"' in html
    assert f'<li id="fn-{fid}"' in html
    assert '<span class="footnote-content">A source</span>' in html
    assert f'href="#fnref-{fid}"' in html


CROSSREF_HTML = (
    '<p>A<sup class="footnote-ref" id="fnref-abc" data-footnote-id="abc">'
    '<a href="#fn-abc">1</a></sup> B'
    '<sup class="footnote-ref" id="fnref-abc-2" data-footnote-id="abc">'
    '<a href="#fn-abc">1</a></sup></p>'
    '<ol class="footnotes"><li id="fn-abc" data-footnote-id="abc">'
    '<span class="footnote-content">Source</span> '
    '<a class="footnote-backref" href="#fnref-abc">↩a</a> '
    '<a class="footnote-backref" href="#fnref-abc-2">↩b</a></li></ol>'
)


@pytest.mark.django_db
def test_footnote_cross_reference_sanitization():
    field = FootnoteProseEditorModel._meta.get_field("description")
    cleaned = field.clean(CROSSREF_HTML, None)
    assert 'id="fnref-abc-2"' in cleaned
    assert 'href="#fnref-abc-2"' in cleaned
    assert cleaned.count('href="#fn-abc"') == 2


@pytest.mark.django_db
@pytest.mark.e2e
def test_footnote_cross_reference_e2e(page, live_server):
    login(page, live_server)
    page.goto(f"{live_server.url}/admin/testapp/footnoteproseeditormodel/add/")

    editor = page.locator(".prose-editor > .ProseMirror")
    crossref_button = page.locator(
        ".prose-menubar__button[title='footnote cross-reference']"
    )

    editor.click()
    editor.type("First claim")
    # No footnotes yet, nothing to reference
    expect(crossref_button).to_have_class(re.compile(r"\bdisabled\b"))

    page.locator(".prose-menubar__button[title='footnote']").click()
    page.keyboard.type("A source")

    # Back to the end of the paragraph
    editor.locator("p").first.click()
    page.keyboard.press("End")
    page.keyboard.type(" and again")

    crossref_button.click()
    dialog = page.locator(".prose-editor-dialog")
    expect(dialog.locator("select[name='footnote'] option")).to_have_count(1)
    dialog.locator("button[type='submit']").click()

    expect(editor.locator("sup.footnote-ref")).to_have_count(2)
    expect(editor.locator("sup.footnote-ref").nth(1)).to_have_text("1")
    expect(editor.locator("ol.footnotes li")).to_have_count(1)
    expect(editor.locator("ol.footnotes .footnote-backref")).to_have_count(2)

    save(page)

    html = FootnoteProseEditorModel.objects.get().description
    fid = re.search(r'id="fnref-(\w+)"', html).group(1)
    assert f'id="fnref-{fid}-2"' in html
    assert html.count(f'href="#fn-{fid}"') == 2
    assert f'href="#fnref-{fid}"' in html
    assert f'href="#fnref-{fid}-2"' in html
