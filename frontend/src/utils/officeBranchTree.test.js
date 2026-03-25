import { describe, expect, it } from "vitest";

import { buildOfficeBranchOptions, flattenOfficeBranchRows } from "./officeBranchTree";

describe("officeBranchTree", () => {
  const rows = [
    { name: "SUB-2", office_branch_name: "Izmir", parent_office_branch: "HQ", is_head_office: 0 },
    { name: "HQ", office_branch_name: "AT Sigorta", parent_office_branch: "", is_head_office: 1 },
    { name: "SUB-1", office_branch_name: "Ankara", parent_office_branch: "HQ", is_head_office: 0 },
    { name: "TEAM-1", office_branch_name: "Cankaya", parent_office_branch: "SUB-1", is_head_office: 0 },
  ];

  it("flattens branches in tree order", () => {
    expect(flattenOfficeBranchRows(rows, { locale: "tr" }).map((row) => `${row.depth}:${row.name}`)).toEqual([
      "0:HQ",
      "1:SUB-1",
      "2:TEAM-1",
      "1:SUB-2",
    ]);
  });

  it("builds indented localized option labels", () => {
    expect(buildOfficeBranchOptions(rows, { locale: "tr" }).map((row) => row.label)).toEqual([
      "AT Sigorta [Merkez]",
      "  - Ankara",
      "    - Cankaya",
      "  - Izmir",
    ]);
  });
});
