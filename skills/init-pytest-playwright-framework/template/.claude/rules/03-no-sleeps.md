# No Sleeps

- No `time.sleep` anywhere except the bounded poll interval in `qa/ui/wait.py`.
- Locator state: `expect(element).to_have_text(...)` from `qa.assertions` (retries until the timeout).
- Values read from the page or the API: `eventually(lambda: _assert_titles(...))`.
