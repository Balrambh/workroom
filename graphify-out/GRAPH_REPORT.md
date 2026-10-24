# Graph Report - RoomForge  (2026-10-24)

## Corpus Check
- 77 files · ~78,038 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .css 3, (none) 1)

## Summary
- 995 nodes · 2449 edges · 33 communities (30 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ca1227b2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ProfilePage.tsx
- store.ts
- lib/types.ts
- routes.ts
- hub.ts
- RoomActions
- server/package.json
- demo-agent.mjs
- web/package.json
- compilerOptions
- scripts
- compilerOptions
- RoomForge Agent API
- trigger.ts
- ChatPanel.tsx
- roomforge-wake.mjs
- src/types.ts
- nowIso
- index.ts
- integration.test.ts
- VoiceStage.tsx
- connector/package.json
- rooms.test.ts
- db.ts
- buildAgentProfile
- TasksPanel.tsx
- mapMessage
- buildUserProfile
- RoomState
- TasksPanel
- createTriggerEvent

## God Nodes (most connected - your core abstractions)
1. `RoomActions` - 47 edges
2. `ChatPanel()` - 38 edges
3. `Icon()` - 36 edges
4. `CheckIcon()` - 35 edges
5. `ArrowUpRightIcon()` - 35 edges
6. `App()` - 33 edges
7. `BranchIcon()` - 30 edges
8. `CopyIcon()` - 30 edges
9. `react` - 29 edges
10. `ProfilePage()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Public site` --references--> `usePageMeta()`  [INFERRED]
  README.md → web/src/lib/meta.ts
- `AvatarProps` --references--> `PrincipalType`  [EXTRACTED]
  web/src/components/Avatar.tsx → web/src/lib/types.ts
- `ProfileAvatarProps` --references--> `PrincipalType`  [EXTRACTED]
  web/src/components/ProfileAvatar.tsx → web/src/lib/types.ts
- `copyPublicLink()` --calls--> `profilePath()`  [EXTRACTED]
  web/src/components/ProfileDialog.tsx → web/src/lib/profile.ts
- `RoomLanding()` --indirect_call--> `readSession()`  [INFERRED]
  web/src/components/RoomLanding.tsx → web/src/lib/session.ts

## Import Cycles
- None detected.

## Communities (33 total, 3 thin omitted)

### Community 0 - "ProfilePage.tsx"
Cohesion: 0.05
Nodes (98): AgentGuide(), AgentGuidePage(), AgentGuideProps, CodeBlock(), SECTIONS, Avatar(), ActivityIcon(), ArrowLeftIcon() (+90 more)

### Community 1 - "store.ts"
Cohesion: 0.05
Nodes (13): addRepo(), getRepo(), leaveRoom(), listActivity(), listPendingJoinRequests(), listRepos(), mapActivity(), mapJoinRequest() (+5 more)

### Community 2 - "lib/types.ts"
Cohesion: 0.05
Nodes (76): react, App(), copy(), handleAuth(), handleLogout(), handleProfileSaved(), showNotice(), submitNewRoom() (+68 more)

### Community 3 - "routes.ts"
Cohesion: 0.06
Nodes (44): express, AuthedRequest, clearSessionCookie(), hashPassword(), newAgentToken(), readSessionToken(), requireAuth(), setSessionCookie() (+36 more)

### Community 4 - "hub.ts"
Cohesion: 0.07
Nodes (72): hashAgentToken(), resolveToken(), agentMessageTimes, agentPresenceStatus(), agentSockets, attachHub(), attachPendingJoin(), broadcast() (+64 more)

### Community 6 - "server/package.json"
Cohesion: 0.05
Nodes (37): bcryptjs, jsonwebtoken, tsx, @types/bcryptjs, @types/express, @types/jsonwebtoken, @types/node, @types/ws (+29 more)

### Community 7 - "demo-agent.mjs"
Cohesion: 0.28
Nodes (11): handledTasks, log(), maybeHandleTask(), maybeReply(), me, patchTask(), postMessage(), repliedMessages (+3 more)

### Community 8 - "web/package.json"
Cohesion: 0.08
Nodes (23): react-dom, @types/react, @types/react-dom, vite, @vitejs/plugin-react, dependencies, react, react-dom (+15 more)

### Community 9 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 10 - "scripts"
Cohesion: 0.11
Nodes (18): devDependencies, concurrently, engines, node, name, private, scripts, agent (+10 more)

### Community 11 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 12 - "RoomForge Agent API"
Cohesion: 0.05
Nodes (39): 10. Real-time over WebSocket, 11. Sleep and wake (trigger mode), 12. Roles and limits, 13. Errors, 1. Get connected (two paths), 2. Join a room with a code (admin approval), 3. Base URL and headers, 4. Find your room (+31 more)

### Community 13 - "trigger.ts"
Cohesion: 0.11
Nodes (26): decryptSecret(), deliverDueTriggers(), deliverEvent(), DeliveryResult, ENCRYPTION_KEY, encryptSecret(), expireStaleWakes(), here (+18 more)

### Community 14 - "ChatPanel.tsx"
Cohesion: 0.09
Nodes (28): ChatPanel(), cancelEdit(), loadOlder(), saveEdit(), send(), startEdit(), startTyping(), stopTyping() (+20 more)

### Community 16 - "roomforge-wake.mjs"
Cohesion: 0.10
Nodes (28): api(), buildPrompt(), catchUp(), [cmd, ...cmdArgs], cursor, enqueue(), handle(), HEADERS (+20 more)

### Community 17 - "src/types.ts"
Cohesion: 0.07
Nodes (34): CreateRoomMessageInput, AgentProfileRow, InsertMessageOptions, JoinRequestRow, NewTaskInput, TriggerEventRow, Activity, AgentProfile (+26 more)

### Community 18 - "nowIso"
Cohesion: 0.11
Nodes (19): approveJoinRequest(), createJoinRequest(), createTask(), denyJoinRequest(), getJoinRequestById(), getRoomLastSeq(), getTask(), insertMessage() (+11 more)

### Community 19 - "index.ts"
Cohesion: 0.10
Nodes (22): AVATAR_COUNT, isAvatarId(), isAvatarValue(), isCustomAvatar(), MAX_AVATAR_LENGTH, closeDb(), app, closeHub (+14 more)

### Community 20 - "integration.test.ts"
Cohesion: 0.12
Nodes (11): api(), ApiOptions, createAgent(), freePort(), roomState(), RUN_ID, serverDir, startServer() (+3 more)

### Community 21 - "VoiceStage.tsx"
Cohesion: 0.06
Nodes (42): AvatarProps, HeadphonesIcon(), HeadphonesOffIcon(), MicIcon(), MicOffIcon(), PhoneOffIcon(), draftFrom(), handleIsValid() (+34 more)

### Community 24 - "connector/package.json"
Cohesion: 0.13
Nodes (14): bin, roomforge-wake, dependencies, ws, description, engines, node, ws (+6 more)

### Community 27 - "rooms.test.ts"
Cohesion: 0.17
Nodes (9): backfillHandles(), handleFromName(), handleValidationError(), normalizeHandle(), guest, guestPrincipal, owner, ownerPrincipal (+1 more)

### Community 31 - "db.ts"
Cohesion: 0.11
Nodes (14): ws, backupDir, db, here, source, stamp, target, addColumn() (+6 more)

### Community 32 - "buildAgentProfile"
Cohesion: 0.11
Nodes (20): pickAvatar(), addMember(), agentOwner(), allocateHandle(), buildAgentProfile(), createAgent(), createRoom(), createUser() (+12 more)

### Community 33 - "TasksPanel.tsx"
Cohesion: 0.19
Nodes (10): FILTERS, GROUP_ORDER, TaskFilter, TasksPanelProps, clockTime(), presenceMeta, roleMeta, taskMeta (+2 more)

### Community 34 - "mapMessage"
Cohesion: 0.20
Nodes (10): deleteMessage(), findMessageByClientId(), getMessageById(), latestMessages(), listMessages(), listMessagesAfter(), listMessagesBeforeSeq(), mapMessage() (+2 more)

### Community 37 - "buildUserProfile"
Cohesion: 0.22
Nodes (9): buildUserProfile(), findUserByHandle(), findUserById(), getUserProfile(), getUserProfileByHandle(), listUserCreatedAgents(), listUserProfileRooms(), profileRoom() (+1 more)

### Community 42 - "RoomState"
Cohesion: 0.31
Nodes (10): ChatPanelProps, LiveFeedProps, PeoplePanelProps, ReposPanelProps, RightPanelProps, RoomSettingsDialogProps, RoomViewProps, VoiceStageProps (+2 more)

### Community 43 - "TasksPanel"
Cohesion: 0.38
Nodes (7): splitPrincipal(), TasksPanel(), changeTask(), createTask(), deleteTask(), reassign(), parsePaths()

### Community 47 - "createTriggerEvent"
Cohesion: 0.50
Nodes (4): createTriggerEvent(), getTriggerEvent(), listDueTriggerEvents(), mapTriggerEvent()

## Knowledge Gaps
- **13 isolated node(s):** `ws`, `concurrently`, `ws`, `@types/bcryptjs`, `@types/express` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 385 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `usePageMeta()` connect `ProfilePage.tsx` to `lib/types.ts`, `RoomForge Agent API`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `CheckIcon()` (e.g. with `AboutPage.tsx` and `HomePage.tsx`) actually correct?**
  _`CheckIcon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ws`, `concurrently`, `ws` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ProfilePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050637694851204534 - nodes in this community are weakly interconnected._
- **Why does `Public site` connect `RoomForge Agent API` to `ProfilePage.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053156146179401995 - nodes in this community are weakly interconnected._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05322953923837576 - nodes in this community are weakly interconnected._