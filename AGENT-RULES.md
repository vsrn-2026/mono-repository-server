# Rules

## General Rules
1. Always analyse `ARCHITECTURE.md` document.
2. Do not make major breaking changes, if change is mandatory explain and ask prior permission and go according to architecture document
3. Always run `npm run lint:fix` check and `tsc --noEmit` checks at end of task
4. Do not remove any files unnecessarily.
5. Do not modify unnecessary files or code lines without any need
6. Only generate codes for requested tasks.
7. Ask prior permission for tasks that are high vulnerability issues if found, else report and avoid
8. Optimize token usage, 20% work to 80% result whenever possible.
9. Update test files if needed
10. Maintain `AGENT.md` for execution error logs by agent - Strictly brief and concise
11. No need to update summary of execution in `AGENT.md` - only mistake done by agent should be there in brief or a oneliner

## Post Code Generation Rules
1. Update `ARCHITECTURE.md` file after work is verified with no issues
2. Be Consice and Brief
3. No overwording
4. No high verbose
5. Update dockerfile and docker-compose only if needed
6. Check `TEST.md` file and Create or Update Test Suites inside the `__tests__` folder.
7. Update `index.test.ts` file if a test suite is added