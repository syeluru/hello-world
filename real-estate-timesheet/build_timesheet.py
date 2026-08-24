"""Build a real estate professional time tracking workbook (REPS substantiation)."""

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

# ---------------------------------------------------------------- style tokens
FONT = "Arial"
NAVY = "1F3864"
LIGHT = "D9E2F3"
BAND = "F2F2F2"
YELLOW = "FFFF00"
GREEN_F = "C6EFCE"
GREEN_T = "006100"
RED_F = "FFC7CE"
RED_T = "9C0006"
GREY_T = "808080"

BLUE_IN = Font(name=FONT, size=10, color="0000FF")          # user inputs
BLACK = Font(name=FONT, size=10)
BLACK_B = Font(name=FONT, size=10, bold=True)
GREEN_LINK = Font(name=FONT, size=10, color="008000")       # cross-sheet formula
TITLE = Font(name=FONT, size=16, bold=True, color=NAVY)
SUB = Font(name=FONT, size=10, italic=True, color="595959")
SECTION = Font(name=FONT, size=11, bold=True, color="FFFFFF")
HDR = Font(name=FONT, size=10, bold=True, color="FFFFFF")
NOTE = Font(name=FONT, size=9, italic=True, color="595959")

FILL_SECTION = PatternFill("solid", fgColor=NAVY)
FILL_HDR = PatternFill("solid", fgColor=NAVY)
FILL_LIGHT = PatternFill("solid", fgColor=LIGHT)
FILL_BAND = PatternFill("solid", fgColor=BAND)
FILL_YELLOW = PatternFill("solid", fgColor=YELLOW)

THIN = Side(style="thin", color="BFBFBF")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

WRAP = Alignment(vertical="top", wrap_text=True)
CTR = Alignment(horizontal="center", vertical="center")

HOURS_FMT = "0.00"
DATE_FMT = "mm/dd/yyyy"
PCT_FMT = "0.0%"

# ---------------------------------------------------------------- source data
# Qualifying flags follow Reg. Sec. 1.469-5T(f)(2)(ii), which excludes work done in
# an investor capacity from counting toward material participation.
CATEGORIES = [
    ("Property showings & client tours", "Yes", "Brokerage - real property trade or business"),
    ("Listing presentations & pricing analysis", "Yes", "Brokerage"),
    ("Buyer / seller consultations", "Yes", "Brokerage"),
    ("Offer preparation & contract negotiation", "Yes", "Brokerage"),
    ("Transaction coordination & closing", "Yes", "Brokerage"),
    ("Acquisition research & due diligence", "Yes", "Acquisition - operational, not investor review"),
    ("Tenant screening & leasing", "Yes", "Rental / leasing"),
    ("Rent collection & tenant communications", "Yes", "Operation / management"),
    ("Property maintenance & repairs (self-performed)", "Yes", "Operation"),
    ("Contractor sourcing, coordination & supervision", "Yes", "Management"),
    ("Property inspections & walkthroughs", "Yes", "Operation"),
    ("Renovation / construction management", "Yes", "Construction / redevelopment"),
    ("Property marketing & advertising", "Yes", "Operation / brokerage"),
    ("Day-to-day operational bookkeeping (invoices, payables)", "Yes", "Operational, not investor analysis"),
    ("Vendor & insurance management", "Yes", "Management"),
    ("Municipal / permitting / compliance work", "Yes", "Operation"),
    ("Travel between properties (business purpose)", "Yes", "CONTESTED - see Instructions; confirm with CPA"),
    ("Reviewing financial statements / operating reports", "No", "Investor activity - Reg. 1.469-5T(f)(2)(ii)(A)"),
    ("Preparing personal financial summaries or analyses", "No", "Investor activity - Reg. 1.469-5T(f)(2)(ii)(B)"),
    ("Non-managerial monitoring of investments", "No", "Investor activity - Reg. 1.469-5T(f)(2)(ii)(C)"),
    ("Continuing education, licensing & seminars", "No", "Education generally not participation; confirm with CPA"),
    ("Commuting (home to office)", "No", "Commuting is not participation"),
    ("Personal tax preparation & planning", "No", "Not a real property trade or business"),
    ("Work in a non-real-estate trade or business", "No", "Counts against the >50% test - log in Setup"),
]

PROPERTIES = [
    "Brokerage - General (no property)",
    "123 Oak Street - Rental",
    "456 Maple Ave - Rental",
]

MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]

# row geometry
LOG_HDR = 4
LOG_FIRST = 5
LOG_LAST = 1004
SETUP_FIRST = 4
PROP_LAST = SETUP_FIRST + 29          # 30 property slots -> row 33
CAT_LAST = SETUP_FIRST + 24           # 25 category slots -> row 28
MO_FIRST = 4
MO_LAST = 15

LOG = "'Time Log'"
E_RANGE = f"{LOG}!$E${LOG_FIRST}:$E${LOG_LAST}"
B_RANGE = f"{LOG}!$B${LOG_FIRST}:$B${LOG_LAST}"
C_RANGE = f"{LOG}!$C${LOG_FIRST}:$C${LOG_LAST}"
F_RANGE = f"{LOG}!$F${LOG_FIRST}:$F${LOG_LAST}"
G_RANGE = f"{LOG}!$G${LOG_FIRST}:$G${LOG_LAST}"

wb = Workbook()


def section(ws, row, text, span):
    """Full-width navy section banner."""
    ws.cell(row=row, column=1, value=text).font = SECTION
    for c in range(1, span + 1):
        ws.cell(row=row, column=c).fill = FILL_SECTION
    ws.row_dimensions[row].height = 20


def headers(ws, row, labels, widths=None):
    for i, label in enumerate(labels, start=1):
        c = ws.cell(row=row, column=i, value=label)
        c.font = HDR
        c.fill = FILL_HDR
        c.border = BOX
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 30
    if widths:
        for i, w in enumerate(widths, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w


# ================================================================ INSTRUCTIONS
ins = wb.active
ins.title = "Instructions"
ins.sheet_view.showGridLines = False
ins.column_dimensions["A"].width = 3
ins.column_dimensions["B"].width = 30
ins.column_dimensions["C"].width = 95

r = 2
ins.cell(row=r, column=2, value="Real Estate Professional - Time Tracking Log").font = TITLE
r += 1
ins.cell(row=r, column=2,
         value="Contemporaneous record of hours for IRC Sec. 469(c)(7) substantiation").font = SUB
r += 2

ins.cell(row=r, column=2, value="HOW TO USE THIS WORKBOOK").font = Font(
    name=FONT, size=12, bold=True, color=NAVY)
r += 1

steps = [
    ("1. Set up first", "On the Setup tab, list your properties/entities and adjust the activity "
                        "categories. Everything else reads from those two lists."),
    ("2. Log as you go", "Enter one row per work session on the Time Log tab. Do it the same day - "
                         "the value of this record is that it is contemporaneous."),
    ("3. Describe the work", "The Description column is what makes an entry defensible. "
                             "\"Showed 412 Elm to the Hartley family, 2 hrs incl. drive\" survives "
                             "review; \"real estate work\" does not."),
    ("4. Log non-RE work", "On Setup, enter monthly hours worked in any non-real-estate job or "
                           "business. The >50% test needs this number."),
    ("5. Review the Dashboard", "It computes both statutory tests and per-property totals "
                                "automatically. Send it to your CPA with the Time Log."),
]
for label, text in steps:
    ins.cell(row=r, column=2, value=label).font = BLACK_B
    c = ins.cell(row=r, column=3, value=text)
    c.font = BLACK
    c.alignment = WRAP
    ins.row_dimensions[r].height = 30
    r += 1

r += 1
ins.cell(row=r, column=2, value="THE TWO TESTS - IRC Sec. 469(c)(7)(B)").font = Font(
    name=FONT, size=12, bold=True, color=NAVY)
r += 1
tests = [
    ("The 750-hour test", "More than 750 hours of service during the tax year in real property "
                          "trades or businesses in which you materially participate."),
    ("The >50% test", "More than half of all personal services you performed in ALL trades or "
                      "businesses during the year must be in real property trades or businesses."),
    ("Both must be met", "Failing either one means no real estate professional status for the year."),
    ("Filing jointly?", "One spouse must satisfy both tests alone. Hours cannot be combined for "
                        "this purpose."),
    ("Then, separately", "Material participation is tested per rental activity - commonly 500 hours "
                         "each - unless you make the Sec. 469(c)(7)(A) election to aggregate. "
                         "The Dashboard tracks each property against 500 hours."),
]
for label, text in tests:
    ins.cell(row=r, column=2, value=label).font = BLACK_B
    c = ins.cell(row=r, column=3, value=text)
    c.font = BLACK
    c.alignment = WRAP
    ins.row_dimensions[r].height = 30
    r += 1

r += 1
ins.cell(row=r, column=2, value="WHAT DOES NOT COUNT").font = Font(
    name=FONT, size=12, bold=True, color=NAVY)
r += 1
excl = [
    ("Investor activities", "Reviewing financial statements, compiling analyses for your own use, "
                            "and non-managerial monitoring do NOT count - Reg. Sec. 1.469-5T(f)(2)(ii) - "
                            "unless you are involved in day-to-day management or operations."),
    ("Education", "Courses, seminars and licensing hours are generally not treated as participation."),
    ("Commuting", "Home-to-office travel is not participation. Travel between properties is "
                  "contested; it is flagged as such in the category list so your CPA can decide."),
]
for label, text in excl:
    ins.cell(row=r, column=2, value=label).font = BLACK_B
    c = ins.cell(row=r, column=3, value=text)
    c.font = BLACK
    c.alignment = WRAP
    ins.row_dimensions[r].height = 32
    r += 1

r += 1
ins.cell(row=r, column=2, value="CELL LEGEND").font = Font(
    name=FONT, size=12, bold=True, color=NAVY)
r += 1
legend = [
    ("Blue text", "You type here. All inputs are blue.", BLUE_IN),
    ("Yellow fill", "Key input that drives the calculations - do not leave blank.", BLACK),
    ("Black text", "Calculated. Do not overwrite.", BLACK),
    ("Green text", "Pulled from another tab. Do not overwrite.", GREEN_LINK),
]
for label, text, font in legend:
    c1 = ins.cell(row=r, column=2, value=label)
    c1.font = font
    if label == "Yellow fill":
        c1.fill = FILL_YELLOW
    ins.cell(row=r, column=3, value=text).font = BLACK
    r += 1

r += 2
c = ins.cell(row=r, column=2,
             value="One workbook per tax year. Row 5 of the Time Log is a filled-in example - "
                   "overwrite it with your first real entry.")
c.font = NOTE
ins.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
r += 2
c = ins.cell(row=r, column=2,
             value="This workbook is a record-keeping tool, not tax advice. Category "
                   "classifications reflect the general rules cited above; your CPA should confirm "
                   "how they apply to your facts before anything here is used on a return.")
c.font = Font(name=FONT, size=9, italic=True, color="9C0006")
c.alignment = WRAP
ins.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
ins.row_dimensions[r].height = 30

# ======================================================================= SETUP
st = wb.create_sheet("Setup")
st.sheet_view.showGridLines = False
st.cell(row=1, column=1, value="Setup - edit these lists").font = TITLE
st.cell(row=2, column=1,
        value="The Time Log dropdowns and every Dashboard total read from here.").font = SUB

for col, w in zip("ABCDEFGH", [42, 3, 46, 14, 52, 3, 16, 26]):
    st.column_dimensions[col].width = w

# properties
h = st.cell(row=3, column=1, value="Properties / Entities")
h.font = HDR
h.fill = FILL_HDR
h.border = BOX
for i in range(SETUP_FIRST, PROP_LAST + 1):
    c = st.cell(row=i, column=1)
    c.font = BLUE_IN
    c.border = BOX
    c.fill = FILL_YELLOW if i <= SETUP_FIRST + 2 else FILL_BAND
for i, name in enumerate(PROPERTIES):
    st.cell(row=SETUP_FIRST + i, column=1, value=name)

# categories
for col, label in ((3, "Activity Category"), (4, "Counts Toward REPS?"), (5, "Basis / Note")):
    c = st.cell(row=3, column=col, value=label)
    c.font = HDR
    c.fill = FILL_HDR
    c.border = BOX
    c.alignment = CTR

for i in range(SETUP_FIRST, CAT_LAST + 1):
    for col in (3, 4, 5):
        c = st.cell(row=i, column=col)
        c.border = BOX
        c.font = BLUE_IN if col in (3, 4) else NOTE
    st.cell(row=i, column=4).alignment = CTR

for i, (name, counts, note) in enumerate(CATEGORIES):
    row = SETUP_FIRST + i
    st.cell(row=row, column=3, value=name)
    st.cell(row=row, column=4, value=counts)
    st.cell(row=row, column=5, value=note)

yesno = DataValidation(type="list", formula1='"Yes,No"', allow_blank=True)
st.add_data_validation(yesno)
yesno.add(f"D{SETUP_FIRST}:D{CAT_LAST}")

# non-real-estate hours
for col, label in ((7, "Month"), (8, "Hours in NON-real-estate work")):
    c = st.cell(row=3, column=col, value=label)
    c.font = HDR
    c.fill = FILL_HDR
    c.border = BOX
    c.alignment = CTR

for i, m in enumerate(MONTHS):
    row = MO_FIRST + i
    c = st.cell(row=row, column=7, value=m)
    c.font = BLACK
    c.border = BOX
    v = st.cell(row=row, column=8, value=0)
    v.font = BLUE_IN
    v.fill = FILL_YELLOW
    v.border = BOX
    v.number_format = HOURS_FMT

tot = st.cell(row=MO_LAST + 1, column=7, value="Total")
tot.font = BLACK_B
tot.border = BOX
tv = st.cell(row=MO_LAST + 1, column=8, value=f"=SUM(H{MO_FIRST}:H{MO_LAST})")
tv.font = BLACK_B
tv.border = BOX
tv.number_format = HOURS_FMT
tv.fill = FILL_LIGHT

st.cell(row=MO_LAST + 3, column=7,
        value="W-2 job, other businesses -\nanything not real property.").font = NOTE
st.cell(row=MO_LAST + 3, column=7).alignment = WRAP

# ==================================================================== TIME LOG
lg = wb.create_sheet("Time Log")
lg.sheet_view.showGridLines = False
lg.cell(row=1, column=1, value="Time Log").font = TITLE
lg.cell(row=2, column=1,
        value="One row per work session. Enter the same day it happens. "
              "Hours in decimals: 15 min = 0.25, 90 min = 1.50.").font = SUB

headers(lg, LOG_HDR,
        ["Date", "Property / Entity", "Activity Category",
         "Description of Work Performed", "Hours", "Counts Toward REPS?", "Mo#"],
        [12, 30, 40, 62, 9, 14, 6])

prop_dv = DataValidation(type="list", formula1=f"=Setup!$A${SETUP_FIRST}:$A${PROP_LAST}",
                         allow_blank=True)
cat_dv = DataValidation(type="list", formula1=f"=Setup!$C${SETUP_FIRST}:$C${CAT_LAST}",
                        allow_blank=True)
lg.add_data_validation(prop_dv)
lg.add_data_validation(cat_dv)
prop_dv.add(f"B{LOG_FIRST}:B{LOG_LAST}")
cat_dv.add(f"C{LOG_FIRST}:C{LOG_LAST}")

for row in range(LOG_FIRST, LOG_LAST + 1):
    for col in range(1, 8):
        c = lg.cell(row=row, column=col)
        c.border = BOX
        if row % 2 == 0:
            c.fill = FILL_BAND

    lg.cell(row=row, column=1).font = BLUE_IN
    lg.cell(row=row, column=1).number_format = DATE_FMT
    lg.cell(row=row, column=2).font = BLUE_IN
    lg.cell(row=row, column=3).font = BLUE_IN
    d = lg.cell(row=row, column=4)
    d.font = BLUE_IN
    d.alignment = WRAP
    h = lg.cell(row=row, column=5)
    h.font = BLUE_IN
    h.number_format = HOURS_FMT

    f = lg.cell(row=row, column=6,
                value=f'=IF($C{row}="","",IFERROR(INDEX(Setup!$D${SETUP_FIRST}:$D${CAT_LAST},'
                      f'MATCH($C{row},Setup!$C${SETUP_FIRST}:$C${CAT_LAST},0)),"CHECK"))')
    f.font = GREEN_LINK
    f.alignment = CTR

    m = lg.cell(row=row, column=7, value=f'=IF($A{row}="","",MONTH($A{row}))')
    m.font = Font(name=FONT, size=9, color=GREY_T)
    m.alignment = CTR

# example row
lg.cell(row=LOG_FIRST, column=1, value="2025-01-06").number_format = DATE_FMT
lg.cell(row=LOG_FIRST, column=2, value=PROPERTIES[1])
lg.cell(row=LOG_FIRST, column=3, value=CATEGORIES[6][0])
lg.cell(row=LOG_FIRST, column=4,
        value="Screened three applicants for the upstairs unit: ran credit and background "
              "checks, called two prior landlords, sent lease to selected tenant.")
lg.cell(row=LOG_FIRST, column=5, value=2.75)
ex = lg.cell(row=LOG_FIRST, column=9, value="<- EXAMPLE ROW - overwrite with your first real entry")
ex.font = Font(name=FONT, size=9, italic=True, color="C00000")
lg.row_dimensions[LOG_FIRST].height = 30

lg.freeze_panes = "A5"
lg.auto_filter.ref = f"A{LOG_HDR}:G{LOG_LAST}"

lg.conditional_formatting.add(
    f"F{LOG_FIRST}:F{LOG_LAST}",
    CellIsRule(operator="equal", formula=['"No"'],
               font=Font(name=FONT, size=10, color=RED_T), fill=PatternFill("solid", fgColor=RED_F)))
lg.conditional_formatting.add(
    f"F{LOG_FIRST}:F{LOG_LAST}",
    CellIsRule(operator="equal", formula=['"Yes"'],
               font=Font(name=FONT, size=10, color=GREEN_T)))

# =================================================================== DASHBOARD
db = wb.create_sheet("Dashboard")
db.sheet_view.showGridLines = False
for col, w in zip("ABCDE", [44, 16, 16, 26, 4]):
    db.column_dimensions[col].width = w

db.cell(row=1, column=1, value="Dashboard - Real Estate Professional Status").font = TITLE
db.cell(row=2, column=1, value="All figures calculated from the Time Log and Setup tabs.").font = SUB

db.cell(row=3, column=1, value="Tax year").font = BLACK_B
ty = db.cell(row=3, column=2, value=2025)
ty.font = BLUE_IN
ty.fill = FILL_YELLOW
ty.border = BOX
ty.number_format = "0"
ty.alignment = CTR

r = 5
section(db, r, "  SUMMARY OF HOURS", 4)
r += 1
summary_start = r
rows_summary = [
    ("Total hours logged", f"=SUM({E_RANGE})", HOURS_FMT),
    ("Qualifying real property hours", f'=SUMIF({F_RANGE},"Yes",{E_RANGE})', HOURS_FMT),
    ("Non-qualifying hours (investor, education, commuting)",
     f'=SUMIF({F_RANGE},"No",{E_RANGE})', HOURS_FMT),
    ("Hours in non-real-estate work", f"=SUM(Setup!$H${MO_FIRST}:$H${MO_LAST})", HOURS_FMT),
    ("Total personal service hours (all trades or businesses)",
     f"=B{summary_start + 1}+B{summary_start + 3}", HOURS_FMT),
]
for label, formula, fmt in rows_summary:
    c = db.cell(row=r, column=1, value=label)
    c.font = BLACK
    c.border = BOX
    v = db.cell(row=r, column=2, value=formula)
    v.font = GREEN_LINK
    v.border = BOX
    v.number_format = fmt
    r += 1

QUAL = f"B{summary_start + 1}"
ALLSVC = f"B{summary_start + 4}"

r += 1
section(db, r, "  STATUTORY TESTS - IRC Sec. 469(c)(7)(B)", 4)
r += 1
headers_row = r
for i, label in enumerate(["Test", "Actual", "Threshold", "Result"], start=1):
    c = db.cell(row=r, column=i, value=label)
    c.font = HDR
    c.fill = FILL_HDR
    c.border = BOX
    c.alignment = CTR
r += 1

t1 = r
db.cell(row=r, column=1, value="More than 750 hours in real property trades or businesses").font = BLACK
db.cell(row=r, column=2, value=f"={QUAL}").font = GREEN_LINK
db.cell(row=r, column=2).number_format = HOURS_FMT
db.cell(row=r, column=3, value=750).font = BLACK
db.cell(row=r, column=3).number_format = HOURS_FMT
db.cell(row=r, column=4, value=f'=IF(B{r}>C{r},"MET","NOT MET")').font = BLACK_B
r += 1

t2 = r
db.cell(row=r, column=1, value="More than 50% of all personal services in real property").font = BLACK
db.cell(row=r, column=2, value=f'=IFERROR({QUAL}/{ALLSVC},0)').font = GREEN_LINK
db.cell(row=r, column=2).number_format = PCT_FMT
db.cell(row=r, column=3, value=0.5).font = BLACK
db.cell(row=r, column=3).number_format = PCT_FMT
db.cell(row=r, column=4, value=f'=IF(B{r}>C{r},"MET","NOT MET")').font = BLACK_B
r += 1

t3 = r
db.cell(row=r, column=1, value="OVERALL - both tests must be met").font = BLACK_B
db.cell(row=r, column=2, value="").font = BLACK
db.cell(row=r, column=3, value="").font = BLACK
db.cell(row=r, column=4,
        value=f'=IF(AND(D{t1}="MET",D{t2}="MET"),"QUALIFIES","DOES NOT QUALIFY")').font = BLACK_B
r += 1

for rr in range(t1, t3 + 1):
    for col in range(1, 5):
        db.cell(row=rr, column=col).border = BOX
        db.cell(row=rr, column=col).alignment = CTR if col > 1 else Alignment(vertical="center")
    db.row_dimensions[rr].height = 18

db.conditional_formatting.add(
    f"D{t1}:D{t3}",
    CellIsRule(operator="equal", formula=['"MET"'],
               font=Font(name=FONT, size=10, bold=True, color=GREEN_T),
               fill=PatternFill("solid", fgColor=GREEN_F)))
db.conditional_formatting.add(
    f"D{t1}:D{t3}",
    CellIsRule(operator="equal", formula=['"QUALIFIES"'],
               font=Font(name=FONT, size=10, bold=True, color=GREEN_T),
               fill=PatternFill("solid", fgColor=GREEN_F)))
db.conditional_formatting.add(
    f"D{t1}:D{t3}",
    FormulaRule(formula=[f'LEFT(D{t1},3)="NOT"'],
                font=Font(name=FONT, size=10, bold=True, color=RED_T),
                fill=PatternFill("solid", fgColor=RED_F)))
db.conditional_formatting.add(
    f"D{t1}:D{t3}",
    CellIsRule(operator="equal", formula=['"DOES NOT QUALIFY"'],
               font=Font(name=FONT, size=10, bold=True, color=RED_T),
               fill=PatternFill("solid", fgColor=RED_F)))

r += 1
gap = db.cell(row=r, column=1, value="Hours still needed to clear 750")
gap.font = BLACK
gap.border = BOX
gv = db.cell(row=r, column=2, value=f"=MAX(0,750-{QUAL})")
gv.font = BLACK
gv.border = BOX
gv.number_format = HOURS_FMT
gv.alignment = CTR
r += 2

# --- material participation by property
section(db, r, "  MATERIAL PARTICIPATION BY PROPERTY (500-hour test)", 4)
r += 1
for i, label in enumerate(["Property / Entity", "Hours", "Qualifying", "500-hour test"], start=1):
    c = db.cell(row=r, column=i, value=label)
    c.font = HDR
    c.fill = FILL_HDR
    c.border = BOX
    c.alignment = CTR
r += 1
prop_first = r
for i in range(30):
    setup_row = SETUP_FIRST + i
    row = prop_first + i
    n = db.cell(row=row, column=1, value=f'=IF(Setup!$A{setup_row}="","",Setup!$A{setup_row})')
    n.font = GREEN_LINK
    h = db.cell(row=row, column=2,
                value=f'=IF($A{row}="","",SUMIFS({E_RANGE},{B_RANGE},$A{row}))')
    q = db.cell(row=row, column=3,
                value=f'=IF($A{row}="","",SUMIFS({E_RANGE},{B_RANGE},$A{row},{F_RANGE},"Yes"))')
    s = db.cell(row=row, column=4,
                value=f'=IF($A{row}="","",IF(C{row}>500,"Met","Below 500"))')
    for c, fmt in ((h, HOURS_FMT), (q, HOURS_FMT)):
        c.font = BLACK
        c.number_format = fmt
        c.alignment = CTR
    s.font = BLACK
    s.alignment = CTR
    for col in range(1, 5):
        db.cell(row=row, column=col).border = BOX
        if i % 2 == 1:
            db.cell(row=row, column=col).fill = FILL_BAND
prop_last_row = prop_first + 29

db.conditional_formatting.add(
    f"D{prop_first}:D{prop_last_row}",
    CellIsRule(operator="equal", formula=['"Met"'],
               font=Font(name=FONT, size=10, color=GREEN_T)))

r = prop_last_row + 1
tl = db.cell(row=r, column=1, value="Total")
tl.font = BLACK_B
tl.fill = FILL_LIGHT
tl.border = BOX
for col, letter in ((2, "B"), (3, "C")):
    c = db.cell(row=r, column=col, value=f"=SUM({letter}{prop_first}:{letter}{prop_last_row})")
    c.font = BLACK_B
    c.fill = FILL_LIGHT
    c.border = BOX
    c.number_format = HOURS_FMT
    c.alignment = CTR
db.cell(row=r, column=4).fill = FILL_LIGHT
db.cell(row=r, column=4).border = BOX
r += 1
n = db.cell(row=r, column=1,
            value="Per-activity 500-hour test applies unless the Sec. 469(c)(7)(A) aggregation "
                  "election is made. Ask your CPA which applies.")
n.font = NOTE
db.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
r += 2

# --- hours by category
section(db, r, "  HOURS BY ACTIVITY CATEGORY", 4)
r += 1
for i, label in enumerate(["Activity Category", "Hours", "Counts?", "% of qualifying"], start=1):
    c = db.cell(row=r, column=i, value=label)
    c.font = HDR
    c.fill = FILL_HDR
    c.border = BOX
    c.alignment = CTR
r += 1
cat_first = r
for i in range(25):
    setup_row = SETUP_FIRST + i
    row = cat_first + i
    n = db.cell(row=row, column=1, value=f'=IF(Setup!$C{setup_row}="","",Setup!$C{setup_row})')
    n.font = GREEN_LINK
    h = db.cell(row=row, column=2,
                value=f'=IF($A{row}="","",SUMIFS({E_RANGE},{C_RANGE},$A{row}))')
    q = db.cell(row=row, column=3,
                value=f'=IF(Setup!$C{setup_row}="","",Setup!$D{setup_row})')
    p = db.cell(row=row, column=4,
                value=f'=IF($A{row}="","",IF($C{row}<>"Yes","",IFERROR(B{row}/{QUAL},0)))')
    h.font = BLACK
    h.number_format = HOURS_FMT
    h.alignment = CTR
    q.font = GREEN_LINK
    q.alignment = CTR
    p.font = BLACK
    p.number_format = PCT_FMT
    p.alignment = CTR
    for col in range(1, 5):
        db.cell(row=row, column=col).border = BOX
        if i % 2 == 1:
            db.cell(row=row, column=col).fill = FILL_BAND
cat_last_row = cat_first + 24
r = cat_last_row + 2

# --- hours by month
section(db, r, "  HOURS BY MONTH", 4)
r += 1
for i, label in enumerate(["Month", "Total hours", "Qualifying", "Cumulative qualifying"], start=1):
    c = db.cell(row=r, column=i, value=label)
    c.font = HDR
    c.fill = FILL_HDR
    c.border = BOX
    c.alignment = CTR
r += 1
mon_first = r
for i, m in enumerate(MONTHS):
    row = mon_first + i
    db.cell(row=row, column=1, value=m).font = BLACK
    t = db.cell(row=row, column=2, value=f"=SUMIFS({E_RANGE},{G_RANGE},{i + 1})")
    q = db.cell(row=row, column=3, value=f'=SUMIFS({E_RANGE},{G_RANGE},{i + 1},{F_RANGE},"Yes")')
    cum = db.cell(row=row, column=4, value=f"=SUM($C${mon_first}:C{row})")
    for c in (t, q, cum):
        c.font = BLACK
        c.number_format = HOURS_FMT
        c.alignment = CTR
    for col in range(1, 5):
        db.cell(row=row, column=col).border = BOX
        if i % 2 == 1:
            db.cell(row=row, column=col).fill = FILL_BAND
mon_last_row = mon_first + 11

r = mon_last_row + 1
tl = db.cell(row=r, column=1, value="Total")
tl.font = BLACK_B
tl.fill = FILL_LIGHT
tl.border = BOX
for col, letter in ((2, "B"), (3, "C")):
    c = db.cell(row=r, column=col, value=f"=SUM({letter}{mon_first}:{letter}{mon_last_row})")
    c.font = BLACK_B
    c.fill = FILL_LIGHT
    c.border = BOX
    c.number_format = HOURS_FMT
    c.alignment = CTR
db.cell(row=r, column=4).fill = FILL_LIGHT
db.cell(row=r, column=4).border = BOX

r += 2
c = db.cell(row=r, column=1,
            value="Prepared from contemporaneous entries. Thresholds are statutory; category "
                  "classifications are the preparer's and should be confirmed by your CPA.")
c.font = NOTE
db.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)

wb.move_sheet("Dashboard", offset=-2)   # Instructions, Dashboard, Time Log, Setup
wb.save("Real_Estate_Professional_Timesheet.xlsx")
print("written")
