# -*- coding: utf-8 -*-
"""
docx_helpers.py
Foundation styling + building helpers for the HIPAA Assessment Toolkit & Textbook.

Design goals:
  * Base font Segoe UI 10 pt everywhere (Normal style + document defaults).
  * Professional heading hierarchy (Part / Chapter / H1 / H2 / H3).
  * Analogy callout boxes, key-point boxes, warning boxes, checklist boxes.
  * Monospace ASCII architecture-diagram boxes with a border.
  * Tables with a shaded header row.
  * Inline numeric references [n] + an auto-collected reference list.
  * Real (auto-updating) Table of Contents field.
  * Page numbers + running footer.
"""

from docx import Document
from docx.shared import Pt, RGBColor, Inches, Twips
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_BREAK
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# ----------------------------------------------------------------------------
# Color palette (deep clinical navy + teal accents — enterprise healthcare)
# ----------------------------------------------------------------------------
NAVY      = RGBColor(0x0B, 0x2E, 0x4F)   # primary headings
TEAL      = RGBColor(0x0E, 0x7C, 0x86)   # accent / H2
STEEL     = RGBColor(0x33, 0x4E, 0x68)   # H3
INK       = RGBColor(0x1A, 0x1A, 0x1A)   # body text
GREY      = RGBColor(0x5A, 0x5A, 0x5A)   # captions
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
CRIMSON   = RGBColor(0x9B, 0x1C, 0x1C)   # warnings
GREEN     = RGBColor(0x1B, 0x5E, 0x20)   # good practice

# Shading hex (no leading #)
SH_ANALOGY   = "EAF4F4"   # light teal
SH_KEY       = "FFF6E0"   # light amber
SH_WARN      = "FBE9E7"   # light red
SH_CHECK     = "ECF3EC"   # light green
SH_DIAGRAM   = "F4F6F8"   # light steel
SH_TABLEHDR  = "0B2E4F"   # navy header
SH_TABLEALT  = "F2F5F8"   # zebra row
SH_PART      = "0B2E4F"


def _set_cell_bg(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)


def _set_cell_borders(cell, color="B7C2CC", sz="6", space="0"):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        el = OxmlElement(f'w:{edge}')
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), sz)
        el.set(qn('w:space'), space)
        el.set(qn('w:color'), color)
        borders.append(el)
    tcPr.append(borders)


def _set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
    tcPr = cell._tc.get_or_add_tcPr()
    m = OxmlElement('w:tcMar')
    for edge, val in (('top', top), ('bottom', bottom), ('start', left), ('end', right)):
        e = OxmlElement(f'w:{edge}')
        e.set(qn('w:w'), str(val))
        e.set(qn('w:type'), 'dxa')
        m.append(e)
    tcPr.append(m)


def _no_space_para(p, before=0, after=0):
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)


class BookBuilder:
    def __init__(self, base_font="Segoe UI", base_size=10):
        self.doc = Document()
        self.base_font = base_font
        self.base_size = base_size
        self.references = []          # ordered list of reference strings
        self._ref_index = {}          # key -> number
        self.chapter_count = 0
        self._setup_styles()
        self._setup_page()

    # ------------------------------------------------------------------ styles
    def _setup_styles(self):
        doc = self.doc
        # Document default (docDefaults) -> Segoe UI 10
        styles = doc.styles
        normal = styles['Normal']
        normal.font.name = self.base_font
        normal.font.size = Pt(self.base_size)
        normal.font.color.rgb = INK
        rpr = normal.element.get_or_add_rPr()
        rfonts = rpr.get_or_add_rFonts()
        for a in ('w:ascii', 'w:hAnsi', 'w:cs', 'w:eastAsia'):
            rfonts.set(qn(a), self.base_font)
        pf = normal.paragraph_format
        pf.space_after = Pt(6)
        pf.line_spacing = 1.18
        pf.line_spacing_rule = WD_LINE_SPACING.MULTIPLE

        def style_heading(name, size, color, bold=True, before=16, after=6,
                          italic=False, keep=True):
            st = styles[name]
            st.font.name = self.base_font
            st.font.size = Pt(size)
            st.font.bold = bold
            st.font.italic = italic
            st.font.color.rgb = color
            rp = st.element.get_or_add_rPr()
            rf = rp.get_or_add_rFonts()
            for a in ('w:ascii', 'w:hAnsi', 'w:cs'):
                rf.set(qn(a), self.base_font)
            pf = st.paragraph_format
            pf.space_before = Pt(before)
            pf.space_after = Pt(after)
            pf.keep_with_next = keep
            return st

        style_heading('Heading 1', 17, NAVY, before=20, after=8)
        style_heading('Heading 2', 13.5, TEAL, before=14, after=5)
        style_heading('Heading 3', 11.5, STEEL, before=11, after=4)
        style_heading('Heading 4', 10.5, STEEL, before=9, after=3, italic=True)
        style_heading('Title', 30, NAVY, before=0, after=8)
        try:
            style_heading('Subtitle', 14, TEAL, bold=False, before=0, after=6, italic=True)
        except KeyError:
            pass

        # Caption style
        if 'Caption' in [s.name for s in styles]:
            cap = styles['Caption']
            cap.font.name = self.base_font
            cap.font.size = Pt(8.5)
            cap.font.italic = True
            cap.font.color.rgb = GREY

    def _setup_page(self):
        sec = self.doc.sections[0]
        sec.page_width = Inches(8.5)
        sec.page_height = Inches(11)
        sec.left_margin = Inches(0.9)
        sec.right_margin = Inches(0.9)
        sec.top_margin = Inches(0.9)
        sec.bottom_margin = Inches(0.9)

    # ------------------------------------------------------------ low-level run
    def _run(self, p, text, bold=False, italic=False, color=None, size=None,
             font=None, mono=False):
        r = p.add_run(text)
        r.bold = bold
        r.italic = italic
        r.font.name = 'Consolas' if mono else (font or self.base_font)
        if mono:
            rf = r._element.get_or_add_rPr().get_or_add_rFonts()
            for a in ('w:ascii', 'w:hAnsi', 'w:cs'):
                rf.set(qn(a), 'Consolas')
        r.font.size = Pt(size if size else (9 if mono else self.base_size))
        if color is not None:
            r.font.color.rgb = color
        return r

    # ------------------------------------------------------------------ blocks
    def para(self, text=None, size=None, bold=False, italic=False, color=None,
             align=None, space_after=6, space_before=0, first_indent=None):
        p = self.doc.add_paragraph()
        _no_space_para(p, space_before, space_after)
        if align:
            p.alignment = align
        if first_indent:
            p.paragraph_format.first_line_indent = Inches(first_indent)
        if text:
            # allow inline **bold** markers
            self._rich(p, text, base_bold=bold, base_italic=italic, color=color, size=size)
        return p

    def _rich(self, p, text, base_bold=False, base_italic=False, color=None, size=None):
        """Very small inline parser supporting **bold** and `code`."""
        import re
        tokens = re.split(r'(\*\*.*?\*\*|`.*?`)', text)
        for tok in tokens:
            if not tok:
                continue
            if tok.startswith('**') and tok.endswith('**'):
                self._run(p, tok[2:-2], bold=True, italic=base_italic, color=color, size=size)
            elif tok.startswith('`') and tok.endswith('`'):
                self._run(p, tok[1:-1], mono=True, color=color)
            else:
                self._run(p, tok, bold=base_bold, italic=base_italic, color=color, size=size)

    def bullet(self, text, level=0, style='List Bullet'):
        p = self.doc.add_paragraph(style=style)
        p.paragraph_format.left_indent = Inches(0.3 + 0.25 * level)
        p.paragraph_format.space_after = Pt(2)
        self._rich(p, text)
        return p

    def number(self, text, level=0):
        p = self.doc.add_paragraph(style='List Number')
        p.paragraph_format.left_indent = Inches(0.3 + 0.25 * level)
        p.paragraph_format.space_after = Pt(2)
        self._rich(p, text)
        return p

    # ------------------------------------------------------------- headings
    def part_divider(self, number, title, blurb=None):
        self.doc.add_page_break()
        p = self.doc.add_paragraph()
        _no_space_para(p, 120, 4)
        self._run(p, f"PART {number}", bold=True, color=TEAL, size=16)
        h = self.doc.add_paragraph()
        _no_space_para(h, 4, 10)
        self._run(h, title, bold=True, color=NAVY, size=26)
        # accent rule
        self._hr(color="0E7C86", size="18")
        if blurb:
            b = self.para(blurb, italic=True, color=STEEL, size=11, space_before=8)
        self.doc.add_page_break()

    def chapter(self, title, number=None):
        self.doc.add_page_break()
        show_eyebrow = True
        if number is None:
            self.chapter_count += 1
            number = self.chapter_count
        elif isinstance(number, int):
            self.chapter_count = number
        else:
            # string label (appendix "A") or "" -> no CHAPTER eyebrow
            show_eyebrow = False
        if show_eyebrow:
            e = self.doc.add_paragraph()
            _no_space_para(e, 0, 0)
            self._run(e, f"CHAPTER {number}", bold=True, color=TEAL, size=11)
        h = self.doc.add_heading(level=1)
        h.text = title
        return number

    def h2(self, text):
        self.doc.add_heading(text, level=2)

    def h3(self, text):
        self.doc.add_heading(text, level=3)

    def h4(self, text):
        self.doc.add_heading(text, level=4)

    def _hr(self, color="0E7C86", size="12"):
        p = self.doc.add_paragraph()
        _no_space_para(p, 2, 6)
        pPr = p._p.get_or_add_pPr()
        pbdr = OxmlElement('w:pBdr')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')
        bottom.set(qn('w:sz'), size)
        bottom.set(qn('w:space'), '1')
        bottom.set(qn('w:color'), color)
        pbdr.append(bottom)
        pPr.append(pbdr)

    # --------------------------------------------------------------- callouts
    def _callout(self, title, body_lines, fill, bar_color, title_color,
                 icon=""):
        """Single-cell shaded, bordered table used as a callout box."""
        tbl = self.doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        _set_cell_bg(cell, fill)
        _set_cell_margins(cell, 100, 100, 160, 160)
        # left accent bar via left border thick
        tcPr = cell._tc.get_or_add_tcPr()
        borders = OxmlElement('w:tcBorders')
        left = OxmlElement('w:left')
        left.set(qn('w:val'), 'single')
        left.set(qn('w:sz'), '26')
        left.set(qn('w:space'), '0')
        left.set(qn('w:color'), bar_color)
        borders.append(left)
        for edge in ('top', 'bottom', 'right'):
            el = OxmlElement(f'w:{edge}')
            el.set(qn('w:val'), 'single')
            el.set(qn('w:sz'), '4')
            el.set(qn('w:space'), '0')
            el.set(qn('w:color'), 'D8DEE4')
            borders.append(el)
        tcPr.append(borders)

        # title line
        cell.paragraphs[0].text = ''
        tp = cell.paragraphs[0]
        _no_space_para(tp, 0, 3)
        self._run(tp, f"{icon}  {title}" if icon else title, bold=True,
                  color=RGBColor.from_string(title_color), size=10.5)
        if isinstance(body_lines, str):
            body_lines = [body_lines]
        for i, line in enumerate(body_lines):
            bp = cell.add_paragraph()
            _no_space_para(bp, 0, 2)
            self._rich(bp, line)
        self.para('', space_after=4)
        return tbl

    def analogy(self, body, title="ANALOGY"):
        return self._callout(title, body, SH_ANALOGY, "0E7C86", "0B4A50", icon="")

    def keypoint(self, body, title="KEY POINT"):
        return self._callout(title, body, SH_KEY, "C48A00", "6B4E00", icon="")

    def warning(self, body, title="COMPLIANCE WARNING"):
        return self._callout(title, body, SH_WARN, "9B1C1C", "7A1616", icon="")

    def goodpractice(self, body, title="LEADING PRACTICE"):
        return self._callout(title, body, SH_CHECK, "1B5E20", "14431A", icon="")

    def checklist(self, items, title="ASSESSMENT CHECKLIST"):
        lines = [f"☐  {it}" for it in items]
        return self._callout(title, lines, SH_CHECK, "0E7C86", "14431A", icon="")

    # ---------------------------------------------------------------- diagram
    def diagram(self, ascii_text, caption=None):
        """Monospace ASCII architecture diagram in a bordered shaded box."""
        tbl = self.doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        _set_cell_bg(cell, SH_DIAGRAM)
        _set_cell_borders(cell, color="9AA7B4", sz="6")
        _set_cell_margins(cell, 120, 120, 160, 160)
        cell.paragraphs[0].text = ''
        first = True
        for line in ascii_text.split('\n'):
            if first:
                p = cell.paragraphs[0]
                first = False
            else:
                p = cell.add_paragraph()
            _no_space_para(p, 0, 0)
            p.paragraph_format.line_spacing = 1.0
            self._run(p, line if line else ' ', mono=True, size=8.5, color=NAVY)
        if caption:
            cp = self.doc.add_paragraph()
            _no_space_para(cp, 2, 8)
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            self._run(cp, caption, italic=True, size=8.5, color=GREY)
        else:
            self.para('', space_after=4)
        return tbl

    # -------------------------------------------------------------- screenshot
    def screenshot(self, path, caption=None, width=6.3):
        """Insert a full-width screenshot with a light border and an italic
        caption beneath it. `path` must exist on disk (PNG)."""
        import os as _os
        if not _os.path.exists(path):
            raise FileNotFoundError(f"screenshot not found: {path}")
        p = self.doc.add_paragraph()
        _no_space_para(p, 6, 2)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run()
        pic = run.add_picture(path, width=Inches(width))
        # Thin grey border on the inline picture
        inline = pic._inline
        docPr = inline.find(qn('wp:docPr'))
        graphic = inline.find(qn('a:graphic'))
        graphicData = graphic.find(qn('a:graphicData'))
        pic_el = graphicData.find(qn('pic:pic'))
        spPr = pic_el.find(qn('pic:spPr'))
        ln = OxmlElement('a:ln')
        ln.set('w', '9525')  # 0.75pt
        solidFill = OxmlElement('a:solidFill')
        srgb = OxmlElement('a:srgbClr')
        srgb.set('val', 'B7C2CC')
        solidFill.append(srgb)
        ln.append(solidFill)
        spPr.append(ln)
        if caption:
            cp = self.doc.add_paragraph()
            _no_space_para(cp, 3, 10)
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            self._run(cp, caption, italic=True, size=8.5, color=GREY)
        else:
            self.para('', space_after=4)

    # ------------------------------------------------------------------ table
    def table(self, headers, rows, caption=None, col_widths=None, font_size=9):
        tbl = self.doc.add_table(rows=1, cols=len(headers))
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.style = 'Table Grid'
        # header
        hdr = tbl.rows[0].cells
        for i, h in enumerate(headers):
            _set_cell_bg(hdr[i], SH_TABLEHDR)
            _set_cell_margins(hdr[i])
            hdr[i].paragraphs[0].text = ''
            p = hdr[i].paragraphs[0]
            _no_space_para(p, 0, 0)
            self._run(p, h, bold=True, color=WHITE, size=font_size)
        for ri, row in enumerate(rows):
            cells = tbl.add_row().cells
            for ci, val in enumerate(row):
                if ri % 2 == 1:
                    _set_cell_bg(cells[ci], SH_TABLEALT)
                _set_cell_margins(cells[ci])
                cells[ci].paragraphs[0].text = ''
                p = cells[ci].paragraphs[0]
                _no_space_para(p, 0, 0)
                self._rich(p, str(val))
                for r in p.runs:
                    r.font.size = Pt(font_size)
        if col_widths:
            for i, w in enumerate(col_widths):
                for row in tbl.rows:
                    row.cells[i].width = Inches(w)
        if caption:
            cp = self.doc.add_paragraph()
            _no_space_para(cp, 2, 8)
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            self._run(cp, caption, italic=True, size=8.5, color=GREY)
        else:
            self.para('', space_after=4)
        return tbl

    # -------------------------------------------------------------- references
    def ref(self, citation_text):
        """Register a reference; return its [n] marker. De-duplicates."""
        key = citation_text.strip()
        if key in self._ref_index:
            n = self._ref_index[key]
        else:
            n = len(self.references) + 1
            self._ref_index[key] = n
            self.references.append(citation_text)
        return f"[{n}]"

    def cite(self, p, citation_text):
        """Add a superscript [n] citation to an existing paragraph."""
        marker = self.ref(citation_text)
        r = p.add_run(marker)
        r.font.size = Pt(7.5)
        r.font.superscript = True
        r.font.color.rgb = TEAL
        return marker

    def render_references(self):
        self.doc.add_page_break()
        h = self.doc.add_heading('References', level=1)
        self.para("The following sources informed this textbook. In-text markers "
                  "[n] correspond to the numbered entries below. URLs were valid "
                  "at the time of writing; standards bodies periodically revise "
                  "documents, so always confirm the current version.",
                  italic=True, color=GREY, size=9)
        for i, r in enumerate(self.references, 1):
            p = self.doc.add_paragraph()
            _no_space_para(p, 0, 3)
            p.paragraph_format.left_indent = Inches(0.35)
            p.paragraph_format.first_line_indent = Inches(-0.35)
            self._run(p, f"[{i}]  ", bold=True, color=TEAL, size=9)
            self._run(p, r, size=9)

    # --------------------------------------------------------------------- TOC
    def add_toc(self):
        h = self.doc.add_heading('Table of Contents', level=1)
        p = self.doc.add_paragraph()
        run = p.add_run()
        fldChar = OxmlElement('w:fldChar')
        fldChar.set(qn('w:fldCharType'), 'begin')
        instrText = OxmlElement('w:instrText')
        instrText.set(qn('xml:space'), 'preserve')
        instrText.text = 'TOC \\o "1-3" \\h \\z \\u'
        fldChar2 = OxmlElement('w:fldChar')
        fldChar2.set(qn('w:fldCharType'), 'separate')
        t = OxmlElement('w:t')
        t.text = "Right-click and choose 'Update Field' to build the table of contents."
        fldChar2.append(t)
        fldChar3 = OxmlElement('w:fldChar')
        fldChar3.set(qn('w:fldCharType'), 'end')
        run._r.append(fldChar)
        run._r.append(instrText)
        run._r.append(fldChar2)
        run._r.append(fldChar3)

    # ------------------------------------------------------------- page numbers
    def add_footer(self, text="HIPAA Assessment Toolkit & Consultant's Textbook"):
        sec = self.doc.sections[0]
        footer = sec.footer
        footer.is_linked_to_previous = False
        p = footer.paragraphs[0]
        p.text = ''
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        self._run(p, text + "   |   Page ", size=8, color=GREY)
        # PAGE field
        run = p.add_run()
        f1 = OxmlElement('w:fldChar'); f1.set(qn('w:fldCharType'), 'begin')
        instr = OxmlElement('w:instrText'); instr.set(qn('xml:space'), 'preserve'); instr.text = 'PAGE'
        f2 = OxmlElement('w:fldChar'); f2.set(qn('w:fldCharType'), 'end')
        run._r.append(f1); run._r.append(instr); run._r.append(f2)
        run.font.size = Pt(8); run.font.color.rgb = GREY

    def page_break(self):
        self.doc.add_page_break()

    def save(self, path):
        self.doc.save(path)
