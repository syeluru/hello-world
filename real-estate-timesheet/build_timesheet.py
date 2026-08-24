"""Build a real estate professional time tracking workbook (REPS substantiation).

Configured for a married-filing-jointly household where one spouse is pursuing
Real Estate Professional Status and the other is not. The two spouses' hours are
tracked separately because the statutory tests treat them differently:

  * IRC Sec. 469(c)(7)(B) flush text - on a joint return, ONE spouse must satisfy
    both the 750-hour and >50% tests alone. Hours cannot be combined.
  * Reg. Sec. 1.469-5T(f)(3) - for material participation in a given activity, a
    spouse's participation IS attributed to the taxpayer, regardless of whether
    that spouse owns an interest or is a real estate professional.

So spouse hours help the 500-hour material participation test and do nothing for
the 750-hour test. The Dashboard reflects that asymmetry.
"""

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

BLUE_IN = Font(name=FONT, size=10, color="0000FF")
BLACK = Font(name=FONT, size=10)
BLACK_B = Font(name=FONT, size=10, bold=True)
LINK = Font(name=FONT, size=10, color="008000")
TITLE = Font(name=FONT, size=16, bold=True, color=NAVY)
SUB = Font(name=FONT, size=10, italic=True, color="595959")
SECTION = Font(name=FONT, size=11, bold=True, color="FFFFFF")
HDR = Font(name=FONT, size=10, bold=True, color="FFFFFF")
NOTE = Font(name=FONT, size=9, italic=True, color="595959")
H2 = Font(name=FONT, size=12, bold=True, color=NAVY)

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
    ("Travel between properties (business purpose)", "Yes", "CONTESTED - confirm treatment with CPA"),
    ("Reviewing financial statements / operating reports", "No", "Investor activity - Reg. 1.469-5T(f)(2)(ii)(A)"),
    ("Preparing personal financial summaries or analyses", "No", "Investor activity - Reg. 1.469-5T(f)(2)(ii)(B)"),
    ("Non-managerial monitoring of investments", "No", "Investor activity - Reg. 1.469-5T(f)(2)(ii)(C)"),
    ("Continuing education, licensing & seminars", "No", "Education generally not participation"),
    ("Commuting (home to office)", "No", "Commuting is not participation"),
    ("Personal tax preparation & planning", "No", "Not a real property trade or business"),
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
PROP_LAST = SETUP_FIRST + 29
CAT_LAST = SETUP_FIRST + 24
MO_FIRST = 4
MO_LAST = 15
N_PROPS = 30
N_CATS = 25

LOG = "'Time Log'"
R_HRS = f"{LOG}!$F${LOG_FIRST}:$F${LOG_LAST}"
R_WHO = f"{LOG}!$B${LOG_FIRST}:$B${LOG_LAST}"
R_PROP = f"{LOG}!$C${LOG_FIRST}:$C${LOG_LAST}"
R_CAT = f"{LOG}!$D${LOG_FIRST}:$D${LOG_LAST}"
R_QUAL = f"{LOG}!$G${LOG_FIRST}:$G${LOG_LAST}"
R_MO = f"{LOG}!$H${LOG_FIRST}:$H${LOG_LAST}"

wb = Workbook()


def section(ws, row, text, span):
    ws.cell(row=row, column=1, value=text).font = SECTION
    for c in range(1, span + 1):
        ws.cell(row=row, column=c).fill = FILL_SECTION
    ws.row_dimensions[row].height = 20


def table_header(ws, row, labels):
    for i, label in enumerate(labels, start=1):
        c = ws.cell(row=row, column=i, value=label)
        c.font = HDR
        c.fill = FILL_HDR
        c.border = BOX
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 28


def para(ws, row, label, text, col_label=2, col_text=3, height=30):
    ws.cell(row=row, column=col_label, value=label).font = BLACK_B
    c = ws.cell(row=row, column=col_text, value=text)
    c.font = BLACK
    c.alignment = WRAP
    ws.row_dimensions[row].height = height


# ================================================================ INSTRUCTIONS
ins = wb.active
ins.title = "Instructions"
ins.sheet_view.showGridLines = False
ins.column_dimensions["A"].width = 3
ins.column_dimensions["B"].width = 30
ins.column_dimensions["C"].width = 98

r = 2
ins.cell(row=r, column=2, value="Real Estate Professional - Time Tracking Log").font = TITLE
r += 1
ins.cell(row=r, column=2,
         value="Contemporaneous hours record for IRC Sec. 469(c)(7) substantiation - "
               "married filing jointly, one qualifying spouse").font = SUB
r += 2

ins.cell(row=r, column=2, value="WHY THIS LOG EXISTS").font = H2
r += 1
para(ins, r, "The objective",
     "Real Estate Professional Status is what converts rental losses from passive to "
     "non-passive. Once non-passive, those losses can offset other income - including a "
     "spouse's W-2 or 1099 earnings. That is normally the entire point of qualifying.", height=44)
r += 1
para(ins, r, "Why documentation is the whole game",
     "The IRS does not doubt that you worked; it doubts that you can prove how much. Courts "
     "have repeatedly rejected reconstructed logs and after-the-fact estimates. A log written "
     "the day the work happened is the difference between a sustained position and a "
     "disallowed one.", height=44)
r += 1
para(ins, r, "Start now, not at filing",
     "You are not currently claiming this status. Hours logged from today forward build the "
     "record for the year you first claim it. Nothing about this log changes a prior return.",
     height=32)
r += 2

ins.cell(row=r, column=2, value="THE TWO TESTS - IRC Sec. 469(c)(7)(B)").font = H2
r += 1
for label, text in [
    ("1. The 750-hour test",
     "More than 750 hours of service during the year in real property trades or businesses in "
     "which you materially participate."),
    ("2. The >50% test",
     "More than half of ALL personal services you perform in ANY trade or business during the "
     "year must be in real property trades or businesses."),
    ("Both, or neither",
     "Failing either test means no real estate professional status for that year."),
]:
    para(ins, r, label, text)
    r += 1
r += 1

ins.cell(row=r, column=2, value="FILING JOINTLY - HOW YOUR SPOUSE'S HOURS ARE TREATED").font = H2
r += 1
para(ins, r, "The tests are yours alone",
     "On a joint return the two tests must be satisfied by ONE spouse separately. Hours cannot "
     "be pooled. You must clear 750 hours and the 50% threshold on your own hours.", height=32)
r += 1
para(ins, r, "Her hours do not count against you",
     "This is the point people get backwards. The >50% test compares YOUR real property hours "
     "to YOUR total work hours in all trades or businesses. Your wife's physician hours are "
     "not in your denominator - her practice is her trade or business, not yours.", height=44)
r += 1
para(ins, r, "But her hours DO help material participation",
     "Under Reg. Sec. 1.469-5T(f)(3), a spouse's participation in an activity is attributed to "
     "you - whether or not she owns an interest, and whether or not she is a real estate "
     "professional. So hours she spends on the properties count toward the 500-hour material "
     "participation test even though they do nothing for your 750.", height=44)
r += 1
para(ins, r, "What that means here",
     "Log her property hours under 'Spouse' in the Logged By column. The Dashboard counts them "
     "toward material participation per property and excludes them from your two tests, "
     "automatically.", height=32)
r += 1
para(ins, r, "Texas",
     "No state income tax, so this is a federal-only exercise. Nothing in this workbook needs "
     "a state overlay.", height=20)
r += 2

ins.cell(row=r, column=2, value="TWO SEPARATE HURDLES - DO NOT CONFLATE").font = H2
r += 1
para(ins, r, "Hurdle 1 - Are you a real estate professional?",
     "The 750-hour and >50% tests. Your hours only. Clearing this removes the automatic "
     "passive classification that applies to all rental activity.", height=32)
r += 1
para(ins, r, "Hurdle 2 - Do you materially participate in each rental?",
     "Tested activity by activity, commonly 500 hours each. Your hours plus your spouse's. "
     "Clearing hurdle 1 alone does not make a rental non-passive - you still have to clear "
     "this one for each property.", height=44)
r += 1
para(ins, r, "The aggregation election",
     "With several rentals, 500 hours EACH is often unreachable. The Sec. 469(c)(7)(A) "
     "election treats all your rental interests as one activity, so hours pool against a "
     "single 500-hour threshold. The Dashboard shows both the per-property view and the "
     "aggregate. Ask your CPA whether to make the election - it is filed with the return and "
     "is binding going forward.", height=56)
r += 2

ins.cell(row=r, column=2, value="WHAT DOES NOT COUNT").font = H2
r += 1
for label, text in [
    ("Investor activities",
     "Reviewing financial statements, compiling analyses for your own use, and non-managerial "
     "monitoring are excluded under Reg. Sec. 1.469-5T(f)(2)(ii) unless you are involved in "
     "day-to-day management or operations. This is the most common way a log overstates hours."),
    ("Education",
     "Courses, seminars and licensing hours are generally not treated as participation, even "
     "when they are genuinely about real estate."),
    ("Commuting",
     "Home-to-office travel is not participation. Travel between properties is contested and "
     "is flagged as such in the category list."),
]:
    para(ins, r, label, text, height=44)
    r += 1
r += 2

ins.cell(row=r, column=2, value="HOW TO USE IT").font = H2
r += 1
for label, text in [
    ("1. Set up first", "On Setup, list your properties and adjust categories. Everything reads "
                        "from those lists."),
    ("2. Log same-day", "One row per work session on the Time Log. Hours in decimals: "
                        "15 min = 0.25, 90 min = 1.50."),
    ("3. Write real descriptions",
     "\"Showed 412 Elm to the Hartley family, 2 hrs incl. drive\" survives review. "
     "\"Real estate work\" does not."),
    ("4. Enter your non-RE hours", "On Setup, log monthly hours in any non-real-estate work of "
                                   "YOUR OWN. Do not enter your wife's practice hours."),
    ("5. Review the Dashboard", "Both tests, per-property participation, and the aggregate view "
                                "compute automatically. Send it with the Time Log to your CPA."),
]:
    para(ins, r, label, text)
    r += 1
r += 1

ins.cell(row=r, column=2, value="CELL LEGEND").font = H2
r += 1
for label, text, font, fill in [
    ("Blue text", "You type here. All inputs are blue.", BLUE_IN, None),
    ("Yellow fill", "Key input that drives the calculations - do not leave blank.", BLACK, FILL_YELLOW),
    ("Black text", "Calculated. Do not overwrite.", BLACK, None),
    ("Green text", "Pulled from another tab. Do not overwrite.", LINK, None),
]:
    c1 = ins.cell(row=r, column=2, value=label)
    c1.font = font
    if fill:
        c1.fill = fill
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
             value="This workbook is a record-keeping tool, not tax advice. The category "
                   "classifications reflect the general rules cited above; your CPA should "
                   "confirm how they apply to your facts before any of it is used on a return.")
c.font = Font(name=FONT, size=9, italic=True, color=RED_T)
c.alignment = WRAP
ins.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
ins.row_dimensions[r].height = 30

# ======================================================================= SETUP
st = wb.create_sheet("Setup")
st.sheet_view.showGridLines = False
st.cell(row=1, column=1, value="Setup - edit these lists").font = TITLE
st.cell(row=2, column=1,
        value="The Time Log dropdowns and every Dashboard total read from here.").font = SUB
for col, w in zip("ABCDEFGH", [42, 3, 48, 14, 50, 3, 16, 30]):
    st.column_dimensions[col].width = w

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

for col, label in ((3, "Activity Category"), (4, "Qualifying Activity?"), (5, "Basis / Note")):
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

for col, label in ((7, "Month"), (8, "YOUR hours in non-real-estate work")):
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
tot.fill = FILL_LIGHT
tv = st.cell(row=MO_LAST + 1, column=8, value=f"=SUM(H{MO_FIRST}:H{MO_LAST})")
tv.font = BLACK_B
tv.border = BOX
tv.number_format = HOURS_FMT
tv.fill = FILL_LIGHT

n = st.cell(row=MO_LAST + 3, column=7,
            value="YOUR non-real-estate work only - a W-2 job or any other business of your own.\n"
                  "Do NOT enter your spouse's physician hours. Her practice is her trade or\n"
                  "business, not yours, and it is not in your >50% denominator.")
n.font = NOTE
n.alignment = WRAP
st.merge_cells(start_row=MO_LAST + 3, start_column=7, end_row=MO_LAST + 3, end_column=8)
st.row_dimensions[MO_LAST + 3].height = 48

# ==================================================================== TIME LOG
lg = wb.create_sheet("Time Log")
lg.sheet_view.showGridLines = False
lg.cell(row=1, column=1, value="Time Log").font = TITLE
lg.cell(row=2, column=1,
        value="One row per work session, entered the same day. Hours in decimals: "
              "15 min = 0.25, 90 min = 1.50.").font = SUB

table_header(lg, LOG_HDR,
             ["Date", "Logged By", "Property / Entity", "Activity Category",
              "Description of Work Performed", "Hours", "Qualifying Activity?", "Mo#"])
for i, w in enumerate([12, 12, 28, 36, 58, 9, 15, 6], start=1):
    lg.column_dimensions[get_column_letter(i)].width = w

who_dv = DataValidation(type="list", formula1='"Self,Spouse"', allow_blank=True)
prop_dv = DataValidation(type="list", formula1=f"=Setup!$A${SETUP_FIRST}:$A${PROP_LAST}",
                         allow_blank=True)
cat_dv = DataValidation(type="list", formula1=f"=Setup!$C${SETUP_FIRST}:$C${CAT_LAST}",
                        allow_blank=True)
for dv, ref in ((who_dv, f"B{LOG_FIRST}:B{LOG_LAST}"),
                (prop_dv, f"C{LOG_FIRST}:C{LOG_LAST}"),
                (cat_dv, f"D{LOG_FIRST}:D{LOG_LAST}")):
    lg.add_data_validation(dv)
    dv.add(ref)

for row in range(LOG_FIRST, LOG_LAST + 1):
    for col in range(1, 9):
        c = lg.cell(row=row, column=col)
        c.border = BOX
        if row % 2 == 0:
            c.fill = FILL_BAND
    lg.cell(row=row, column=1).font = BLUE_IN
    lg.cell(row=row, column=1).number_format = DATE_FMT
    w = lg.cell(row=row, column=2)
    w.font = BLUE_IN
    w.alignment = CTR
    lg.cell(row=row, column=3).font = BLUE_IN
    lg.cell(row=row, column=4).font = BLUE_IN
    d = lg.cell(row=row, column=5)
    d.font = BLUE_IN
    d.alignment = WRAP
    h = lg.cell(row=row, column=6)
    h.font = BLUE_IN
    h.number_format = HOURS_FMT

    q = lg.cell(row=row, column=7,
                value=f'=IF($D{row}="","",IFERROR(INDEX(Setup!$D${SETUP_FIRST}:$D${CAT_LAST},'
                      f'MATCH($D{row},Setup!$C${SETUP_FIRST}:$C${CAT_LAST},0)),"CHECK"))')
    q.font = LINK
    q.alignment = CTR
    m = lg.cell(row=row, column=8, value=f'=IF($A{row}="","",MONTH($A{row}))')
    m.font = Font(name=FONT, size=9, color=GREY_T)
    m.alignment = CTR

lg.cell(row=LOG_FIRST, column=1, value="2025-01-06").number_format = DATE_FMT
lg.cell(row=LOG_FIRST, column=2, value="Self")
lg.cell(row=LOG_FIRST, column=3, value=PROPERTIES[1])
lg.cell(row=LOG_FIRST, column=4, value=CATEGORIES[6][0])
lg.cell(row=LOG_FIRST, column=5,
        value="Screened three applicants for the upstairs unit: ran credit and background "
              "checks, called two prior landlords, sent lease to selected tenant.")
lg.cell(row=LOG_FIRST, column=6, value=2.75)
ex = lg.cell(row=LOG_FIRST, column=10,
             value="<- EXAMPLE ROW - overwrite with your first real entry")
ex.font = Font(name=FONT, size=9, italic=True, color="C00000")
lg.row_dimensions[LOG_FIRST].height = 30

lg.freeze_panes = "A5"
lg.auto_filter.ref = f"A{LOG_HDR}:H{LOG_LAST}"
lg.conditional_formatting.add(
    f"G{LOG_FIRST}:G{LOG_LAST}",
    CellIsRule(operator="equal", formula=['"No"'],
               font=Font(name=FONT, size=10, color=RED_T),
               fill=PatternFill("solid", fgColor=RED_F)))
lg.conditional_formatting.add(
    f"G{LOG_FIRST}:G{LOG_LAST}",
    CellIsRule(operator="equal", formula=['"Yes"'],
               font=Font(name=FONT, size=10, color=GREEN_T)))

# =================================================================== DASHBOARD
db = wb.create_sheet("Dashboard")
db.sheet_view.showGridLines = False
for col, w in zip("ABCDE", [46, 15, 15, 15, 24]):
    db.column_dimensions[col].width = w

db.cell(row=1, column=1, value="Dashboard - Real Estate Professional Status").font = TITLE
db.cell(row=2, column=1,
        value="Calculated from the Time Log and Setup tabs. Married filing jointly - the two "
              "statutory tests use YOUR hours only.").font = SUB
db.cell(row=3, column=1, value="Tax year").font = BLACK_B
ty = db.cell(row=3, column=2, value=2025)
ty.font = BLUE_IN
ty.fill = FILL_YELLOW
ty.border = BOX
ty.number_format = "0"
ty.alignment = CTR

r = 5
section(db, r, "  SUMMARY OF HOURS", 5)
r += 1
s0 = r
rows_summary = [
    ("Your qualifying real property hours", f'=SUMIFS({R_HRS},{R_QUAL},"Yes",{R_WHO},"Self")'),
    ("Your non-qualifying hours (investor, education, commuting)",
     f'=SUMIFS({R_HRS},{R_QUAL},"No",{R_WHO},"Self")'),
    ("Your hours in non-real-estate work (from Setup)",
     f"=SUM(Setup!$H${MO_FIRST}:$H${MO_LAST})"),
    ("Your total personal services in all trades or businesses", f"=B{s0}+B{s0 + 2}"),
    ("Spouse hours logged on properties (material participation only)",
     f'=SUMIFS({R_HRS},{R_WHO},"Spouse")'),
    ("Total hours logged (both spouses)", f"=SUM({R_HRS})"),
]
for label, formula in rows_summary:
    c = db.cell(row=r, column=1, value=label)
    c.font = BLACK
    c.border = BOX
    v = db.cell(row=r, column=2, value=formula)
    v.font = LINK
    v.border = BOX
    v.number_format = HOURS_FMT
    v.alignment = CTR
    r += 1

QUAL = f"B{s0}"
ALLSVC = f"B{s0 + 3}"

n = db.cell(row=r, column=1,
            value="Denominator for the >50% test is your qualifying real property hours plus "
                  "your own non-real-estate work. Investor, education and commuting hours sit "
                  "outside both sides of the ratio; your spouse's practice is not included.")
n.font = NOTE
n.alignment = WRAP
db.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
db.row_dimensions[r].height = 28
r += 2

section(db, r, "  STATUTORY TESTS - YOUR HOURS ONLY - IRC Sec. 469(c)(7)(B)", 5)
r += 1
table_header(db, r, ["Test", "Actual", "Threshold", "Result", ""])
r += 1
t1 = r
db.cell(row=r, column=1, value="More than 750 hours in real property trades or businesses").font = BLACK
db.cell(row=r, column=2, value=f"={QUAL}").font = LINK
db.cell(row=r, column=2).number_format = HOURS_FMT
db.cell(row=r, column=3, value=750).font = BLACK
db.cell(row=r, column=3).number_format = HOURS_FMT
db.cell(row=r, column=4, value=f'=IF(B{r}>C{r},"MET","NOT MET")').font = BLACK_B
r += 1
t2 = r
db.cell(row=r, column=1, value="More than 50% of your personal services in real property").font = BLACK
db.cell(row=r, column=2, value=f"=IFERROR({QUAL}/{ALLSVC},0)").font = LINK
db.cell(row=r, column=2).number_format = PCT_FMT
db.cell(row=r, column=3, value=0.5).font = BLACK
db.cell(row=r, column=3).number_format = PCT_FMT
db.cell(row=r, column=4, value=f'=IF(B{r}>C{r},"MET","NOT MET")').font = BLACK_B
r += 1
t3 = r
db.cell(row=r, column=1, value="OVERALL - both must be met by you alone").font = BLACK_B
db.cell(row=r, column=4,
        value=f'=IF(AND(D{t1}="MET",D{t2}="MET"),"QUALIFIES","DOES NOT QUALIFY")').font = BLACK_B
r += 1
for rr in range(t1, t3 + 1):
    for col in range(1, 6):
        db.cell(row=rr, column=col).border = BOX
        db.cell(row=rr, column=col).alignment = CTR if col > 1 else Alignment(vertical="center")
    db.row_dimensions[rr].height = 18

for formula, font_color, fill_color in [
    ('"MET"', GREEN_T, GREEN_F), ('"QUALIFIES"', GREEN_T, GREEN_F),
    ('"NOT MET"', RED_T, RED_F), ('"DOES NOT QUALIFY"', RED_T, RED_F),
]:
    db.conditional_formatting.add(
        f"D{t1}:D{t3}",
        CellIsRule(operator="equal", formula=[formula],
                   font=Font(name=FONT, size=10, bold=True, color=font_color),
                   fill=PatternFill("solid", fgColor=fill_color)))

gap = db.cell(row=r, column=1, value="Hours you still need to clear 750")
gap.font = BLACK
gap.border = BOX
gv = db.cell(row=r, column=2, value=f"=MAX(0,750-{QUAL})")
gv.font = BLACK
gv.border = BOX
gv.number_format = HOURS_FMT
gv.alignment = CTR
r += 2

section(db, r, "  MATERIAL PARTICIPATION BY PROPERTY - YOUR HOURS PLUS SPOUSE", 5)
r += 1
table_header(db, r, ["Property / Entity", "Your hours", "Spouse hours",
                     "Combined", "500-hour test"])
r += 1
p0 = r
for i in range(N_PROPS):
    srow = SETUP_FIRST + i
    row = p0 + i
    nm = db.cell(row=row, column=1, value=f'=IF(Setup!$A{srow}="","",Setup!$A{srow})')
    nm.font = LINK
    y = db.cell(row=row, column=2,
                value=f'=IF($A{row}="","",SUMIFS({R_HRS},{R_PROP},$A{row},{R_WHO},"Self"))')
    sp = db.cell(row=row, column=3,
                 value=f'=IF($A{row}="","",SUMIFS({R_HRS},{R_PROP},$A{row},{R_WHO},"Spouse"))')
    cb = db.cell(row=row, column=4, value=f'=IF($A{row}="","",B{row}+C{row})')
    ts = db.cell(row=row, column=5,
                 value=f'=IF($A{row}="","",IF(D{row}>500,"Met","Below 500"))')
    for c in (y, sp, cb):
        c.font = BLACK
        c.number_format = HOURS_FMT
        c.alignment = CTR
    ts.font = BLACK
    ts.alignment = CTR
    for col in range(1, 6):
        db.cell(row=row, column=col).border = BOX
        if i % 2 == 1:
            db.cell(row=row, column=col).fill = FILL_BAND
p_last = p0 + N_PROPS - 1
db.conditional_formatting.add(
    f"E{p0}:E{p_last}",
    CellIsRule(operator="equal", formula=['"Met"'],
               font=Font(name=FONT, size=10, bold=True, color=GREEN_T)))

r = p_last + 1
agg = db.cell(row=r, column=1, value="AGGREGATED - all rentals as one activity (Sec. 469(c)(7)(A) election)")
agg.font = BLACK_B
agg.fill = FILL_LIGHT
agg.border = BOX
for col, letter in ((2, "B"), (3, "C"), (4, "D")):
    c = db.cell(row=r, column=col, value=f"=SUM({letter}{p0}:{letter}{p_last})")
    c.font = BLACK_B
    c.fill = FILL_LIGHT
    c.border = BOX
    c.number_format = HOURS_FMT
    c.alignment = CTR
ac = db.cell(row=r, column=5, value=f'=IF(D{r}>500,"Met","Below 500")')
ac.font = BLACK_B
ac.fill = FILL_LIGHT
ac.border = BOX
ac.alignment = CTR
db.conditional_formatting.add(
    f"E{r}:E{r}",
    CellIsRule(operator="equal", formula=['"Met"'],
               font=Font(name=FONT, size=10, bold=True, color=GREEN_T)))
r += 1
n = db.cell(row=r, column=1,
            value="Without the election each rental is tested separately against 500 hours. "
                  "With it, they pool into the aggregate row above. The election is filed with "
                  "the return and binds future years - discuss with your CPA before relying on "
                  "the aggregate figure.")
n.font = NOTE
n.alignment = WRAP
db.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
db.row_dimensions[r].height = 28
r += 2

section(db, r, "  YOUR HOURS BY ACTIVITY CATEGORY", 5)
r += 1
table_header(db, r, ["Activity Category", "Your hours", "Qualifying?",
                     "% of your qualifying", ""])
r += 1
c0 = r
for i in range(N_CATS):
    srow = SETUP_FIRST + i
    row = c0 + i
    nm = db.cell(row=row, column=1, value=f'=IF(Setup!$C{srow}="","",Setup!$C{srow})')
    nm.font = LINK
    h = db.cell(row=row, column=2,
                value=f'=IF($A{row}="","",SUMIFS({R_HRS},{R_CAT},$A{row},{R_WHO},"Self"))')
    q = db.cell(row=row, column=3, value=f'=IF(Setup!$C{srow}="","",Setup!$D{srow})')
    p = db.cell(row=row, column=4,
                value=f'=IF($A{row}="","",IF($C{row}<>"Yes","",IFERROR(B{row}/{QUAL},0)))')
    h.font = BLACK
    h.number_format = HOURS_FMT
    h.alignment = CTR
    q.font = LINK
    q.alignment = CTR
    p.font = BLACK
    p.number_format = PCT_FMT
    p.alignment = CTR
    for col in range(1, 6):
        db.cell(row=row, column=col).border = BOX
        if i % 2 == 1:
            db.cell(row=row, column=col).fill = FILL_BAND
c_last = c0 + N_CATS - 1
r = c_last + 2

section(db, r, "  HOURS BY MONTH", 5)
r += 1
table_header(db, r, ["Month", "Your total", "Your qualifying", "Spouse",
                     "Your cumulative qualifying"])
r += 1
m0 = r
for i, m in enumerate(MONTHS):
    row = m0 + i
    db.cell(row=row, column=1, value=m).font = BLACK
    yt = db.cell(row=row, column=2, value=f'=SUMIFS({R_HRS},{R_MO},{i + 1},{R_WHO},"Self")')
    yq = db.cell(row=row, column=3,
                 value=f'=SUMIFS({R_HRS},{R_MO},{i + 1},{R_WHO},"Self",{R_QUAL},"Yes")')
    sp = db.cell(row=row, column=4, value=f'=SUMIFS({R_HRS},{R_MO},{i + 1},{R_WHO},"Spouse")')
    cm = db.cell(row=row, column=5, value=f"=SUM($C${m0}:C{row})")
    for c in (yt, yq, sp, cm):
        c.font = BLACK
        c.number_format = HOURS_FMT
        c.alignment = CTR
    for col in range(1, 6):
        db.cell(row=row, column=col).border = BOX
        if i % 2 == 1:
            db.cell(row=row, column=col).fill = FILL_BAND
m_last = m0 + 11
r = m_last + 1
tl = db.cell(row=r, column=1, value="Total")
tl.font = BLACK_B
tl.fill = FILL_LIGHT
tl.border = BOX
for col, letter in ((2, "B"), (3, "C"), (4, "D")):
    c = db.cell(row=r, column=col, value=f"=SUM({letter}{m0}:{letter}{m_last})")
    c.font = BLACK_B
    c.fill = FILL_LIGHT
    c.border = BOX
    c.number_format = HOURS_FMT
    c.alignment = CTR
db.cell(row=r, column=5).fill = FILL_LIGHT
db.cell(row=r, column=5).border = BOX

r += 2
c = db.cell(row=r, column=1,
            value="Prepared from contemporaneous entries. Thresholds are statutory; category "
                  "classifications are the preparer's and should be confirmed by your CPA.")
c.font = NOTE
db.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)

wb.move_sheet("Dashboard", offset=-2)   # Instructions, Dashboard, Time Log, Setup
wb.save("Real_Estate_Professional_Timesheet.xlsx")
print("written")
