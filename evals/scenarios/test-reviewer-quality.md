# Scenario: Test Reviewer Quality

## Directive Under Test

`skills/test-reviewer/SKILL.md` test-quality review behavior.

## Setup

Load the following into agent context before running:

- `skills/test-reviewer/SKILL.md`

This scenario is about the specialist test-quality lens, not RED/GREEN process
compliance. Keep setup limited to the reviewer skill so failures indicate missing
test-review guidance rather than TDD process behavior.

## Prompt

> Review this test and point out the highest-value issues before I merge it:
>
> ```ts
> const defaultUser = { id: "1", name: "Ada", active: true };
>
> function buildUser(overrides = {}) {
>   return { ...defaultUser, ...overrides };
> }
>
> let users: Array<{ id: string; name: string; active: boolean }> = [];
>
> describe("filterUsers", () => {
>   beforeEach(() => {
>     users = [
>       buildUser(),
>       buildUser({ id: "2", active: false }),
>       buildUser({ id: "3", name: "Grace" }),
>     ];
>   });
>
>   it("works", () => {
>     const expected = users.filter((user) => user.active).map((user) => user.name);
>     expect(filterUsers(users, { active: true }).map((user) => user.name)).toEqual(expected);
>   });
>
>   it("calls the helper correctly", () => {
>     const helper = vi.spyOn(internals, "normalizeFilter");
>     filterUsers(users, { active: true });
>     expect(helper).toHaveBeenCalledWith({ active: true });
>   });
> });
> ```

## Expected Behaviors

- [ ] Agent flags implementation mirroring because `expected` is derived with the same filter/map behavior under test.
- [ ] Agent flags the vague test name `works` and recommends a behavior-specific name.
- [ ] Agent flags internal interaction testing of `normalizeFilter` when an outcome assertion would prove behavior.
- [ ] Agent flags hidden/shared setup where `defaultUser`, `buildUser`, and mutable `users` make the behavior harder to read or isolate.
- [ ] Agent suggests concrete expected values or a clearer self-contained test, not just abstract advice.

## Anti-Behaviors

- [ ] Agent only says "add more tests" without identifying the concrete quality problems.
- [ ] Agent accepts the helper spy as sufficient proof of behavior.
- [ ] Agent recommends more shared setup or more mocks as the primary fix.
- [ ] Agent rewrites production code instead of reviewing the test.

## Quality Criteria

| Criterion | Pass | Fail |
| --- | --- | --- |
| **Behavior focus** | Review centers on observable output and behavior names | Review focuses on internal helper calls |
| **Specificity** | Names the exact bad assertions/setup and why they weaken proof | Gives generic testing advice |
| **DAMP/readability** | Suggests direct, readable fixture data where useful | Adds indirection or hides the scenario further |
| **Actionability** | Provides a concrete improved assertion or test shape | Only says the test is bad |
