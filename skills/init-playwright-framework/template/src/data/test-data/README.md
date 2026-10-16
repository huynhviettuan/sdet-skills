# Test data

Static test-data fixtures (JSON) and factories live here. See `.claude/skills/manage-test-data.md` for the
factory + auto-cleanup fixture patterns used to generate and tear down data safely under parallel tests.

Passwords are never stored here: `users.json` carries the placeholder `${PASSWORD}`; read real credentials from `Config.auth.password` (environment). The audit (`npm run audit`) blocks literal credentials in this folder.
