# S04 — Roles and permissions sheet
`04_roles_sheet.md` · md · 474 words · kind: reference data (permission matrix) · stated date: snapshot 2026-10-15
[S04 L2] · authority: "The service enforces this table; the PRD links to it" [S04 L4], self-declared "Basis:
assumption (an example product)" [S04 L4] · read: all sections

## Summary
The permission matrix the PRD and the meeting notes point to: six example users across two tenants, the response
code for each kind of denial, a role-by-capability table with scope (own / tenant / all), and ten worked examples
against one order owned by alice.

## Sections
| Section | Lines | What it covers |
|---|---|---|
| Example users | L6-L15 | alice, erin (tenant-a customers), bob (tenant-b customer), carol, dave (managers), root (admin) |
| Response codes | L17-L24 | 401 no/invalid token, 403 function, 404 hidden object (BR-SEC-001) or missing object |
| Matrix | L26-L40 | nine capabilities × three roles with scope |
| Worked examples | L42-L57 | AZ-002..AZ-019 against alice's order |
| Not covered | L59-L60 | list scoping; manager edit of the same tenant |

## Facts
- Users: alice, erin in tenant-a (customers); bob in tenant-b (customer); carol manages tenant-a, dave tenant-b;
  root is admin with no tenant [S04 L10-L15].
- Codes: 401 for no, invalid or expired token [S04 L21]; 403 when the function is not for the role [S04 L22]; 404
  when the object must not be known to the caller — BR-SEC-001 "do not confirm existence" [S04 L23]; 404 when it does
  not exist [S04 L24].
- Matrix: create — customer yes, manager yes, admin no (403) [S04 L33]; read and list — own / tenant / all
  [S04 L34-L35]; edit the note — own / no (403) / no (403) [S04 L36]; change the status — no for every role
  [S04 L37]; delete — no (403) / tenant / all [S04 L38]; list users and read the audit log — admin only [S04 L39-L40].
- Worked examples: owner reads 200 [S04 L48]; same-tenant customer 404 [S04 L49]; other-tenant customer 404
  [S04 L50]; same-tenant manager 200 [S04 L51]; other-tenant manager 404 [S04 L52]; admin 200 [S04 L53]; owner
  delete 403 [S04 L54]; same-tenant manager delete 204 [S04 L55]; admin delete 204 [S04 L56]; admin create 403
  [S04 L57].
- Gaps the sheet names itself: list scoping per actor; edit by a same-tenant manager [S04 L59-L60].

## Terms
- *scope* — own / tenant / all, defined at [S04 L28].

## Noticed
- The sheet lists an example password for the example users [S04 L6]. It is documented there as an example value;
  the KB does not copy it.
- "change the status: no / no / no" [S04 L37] contradicts PRD BR-ORD-02 (manager marks shipped, S01 L36) and PRD
  section 7 (manager sets paid, S01 L64).
- There is no "cancel an order" row in the matrix [S04 L30-L40]; who may cancel comes only from the PRD and S02.
- "manager: create an order: yes" [S04 L33] — the PRD never says a manager places orders (S01 L9 speaks of
  customers placing orders); not contradicted, just unmentioned.
