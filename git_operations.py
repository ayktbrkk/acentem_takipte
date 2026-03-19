import subprocess

repo = r"C:\Users\Aykut\Documents\GitHub\acentem_takipte"

# Step 1: git status
r1 = subprocess.run(["git", "status", "--short"], cwd=repo, capture_output=True, text=True)
print("STATUS:", r1.stdout, r1.stderr)

# Step 2: git add
files = [
    "frontend/src/pages/Reports.vue",
    "frontend/src/pages/ClaimsBoard.vue",
    "frontend/src/pages/CustomerList.vue",
    "frontend/src/pages/LeadList.vue",
    "frontend/src/pages/OfferBoard.vue",
    "frontend/src/pages/PolicyList.vue",
    "frontend/src/pages/CustomerDetail.vue",
    "MD/KALAN-ISLER.md",
]
r2 = subprocess.run(["git", "add"] + files, cwd=repo, capture_output=True, text=True)
print("ADD:", r2.stdout, r2.stderr, "rc:", r2.returncode)

# Step 3: git commit
msg = """design-system: fix Reports.vue duplicate header and clean up unused imports

- Fix duplicate page title in Reports.vue: remove title/subtitle props from
  PageToolbar since detail-topbar is now the canonical header
- Remove unused PageToolbar import from ClaimsBoard, CustomerList, LeadList,
  OfferBoard, PolicyList
- Remove unused DocHeaderCard import from CustomerDetail
- Remove unused QuickCreateDialogShell, QuickCreateFormRenderer, SectionCardHeader
  imports from CustomerList, PolicyList
- Update KALAN-ISLER.md to reflect completed tasks

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"""

r3 = subprocess.run(["git", "commit", "-m", msg], cwd=repo, capture_output=True, text=True)
print("COMMIT:", r3.stdout, r3.stderr, "rc:", r3.returncode)
