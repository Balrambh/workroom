# Graph Report - RoomForge  (2026-10-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 454 nodes · 1016 edges · 12 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24ace810`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11

## God Nodes (most connected - your core abstractions)
1. `RoomActions` - 28 edges
2. `App()` - 24 edges
3. `BranchIcon()` - 22 edges
4. `RoomLanding()` - 19 edges
5. `Icon()` - 18 edges
6. `PeoplePanel()` - 18 edges
7. `RoomState` - 17 edges
8. `send()` - 15 edges
9. `compilerOptions` - 15 edges
10. `CheckIcon()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `PublicRoomsPage()` --indirect_call--> `readSession()`  [INFERRED]
  web/src/components/PublicRooms.tsx → web/src/lib/session.ts
- `AuthScreenProps` --references--> `Session`  [EXTRACTED]
  web/src/components/AuthScreen.tsx → web/src/lib/types.ts
- `AuthedRequest` --references--> `Principal`  [EXTRACTED]
  server/src/auth.ts → server/src/types.ts
- `principalOf()` --calls--> `HttpError`  [EXTRACTED]
  server/src/routes.ts → server/src/errors.ts
- `userOnly()` --calls--> `HttpError`  [EXTRACTED]
  server/src/routes.ts → server/src/errors.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (47): react, AgentGuide(), AgentGuidePage(), AgentGuideProps, CodeBlock(), SECTIONS, AuthScreen(), ChatPanel() (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (45): addMember(), addRepo(), approveJoinRequest(), createAgent(), createJoinRequest(), createRoom(), createTask(), createUser() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (46): App(), copy(), handleAuth(), handleLogout(), showNotice(), submitNewRoom(), appendById(), AppProps (+38 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (35): express, zod, AuthedRequest, hashAgentToken(), hashPassword(), newAgentToken(), requireAuth(), resolveToken() (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (42): attachHub(), attachPendingJoin(), broadcast(), broadcastJoinRequests(), broadcastMembers(), broadcastPresence(), buildRoomState(), Client (+34 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (21): ChatPanelProps, LiveFeedProps, PeoplePanelProps, ReposPanelProps, RightPanelProps, RoomViewProps, GROUP_ORDER, splitPrincipal() (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (32): bcryptjs, jsonwebtoken, tsx, @types/bcryptjs, @types/express, @types/jsonwebtoken, @types/node, @types/ws (+24 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (20): ws, handleLine(), interactive, presence, printPresence(), prompt(), queued, rl (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (23): react-dom, @types/react, @types/react-dom, vite, @vitejs/plugin-react, dependencies, react, react-dom (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): devDependencies, concurrently, engines, node, name, private, scripts, agent (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (11): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

## Knowledge Gaps
- **9 isolated node(s):** `concurrently`, `tsx`, `@types/bcryptjs`, `@types/express`, `@types/jsonwebtoken` (+4 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 184 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `typescript` connect `Community 8` to `Community 6`?**
  _High betweenness centrality (0.405) - this node is a cross-community bridge._
- **What connects `concurrently`, `tsx`, `@types/bcryptjs` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0909456740442656 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 0` to `Community 8`, `Community 2`, `Community 5`?**
  _High betweenness centrality (0.373) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05254237288135593 - nodes in this community are weakly interconnected._
- **Why does `ws` connect `Community 7` to `Community 4`, `Community 6`?**
  _High betweenness centrality (0.223) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08299240210403273 - nodes in this community are weakly interconnected._