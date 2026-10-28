---
description: a pile of mixed-format project documents should trigger project-knowledge-base
tags: [project-knowledge-base, trigger]
runs: 2
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---
We inherited a clinic booking product. Everything anyone knows about it is in a folder of about 40 files: Word
specs, a couple of PDFs, markdown notes, meeting minutes, some screenshots of the old UI and a decisions spreadsheet.
Nobody has read all of it. I want one place a new tester can read in an hour and search in seconds: what the product
does, every flow we can find in those files, the roles, and where the documents contradict each other, with each
statement pointing back to where it came from. Tell me how you'd go about it and what I need to give you.
