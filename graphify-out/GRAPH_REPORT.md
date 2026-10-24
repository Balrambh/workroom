# Graph Report - RoomForge  (2026-10-24)

## Corpus Check
- 75 files · ~74,634 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .css 3, (none) 1)

## Summary
- 961 nodes · 2300 edges · 52 communities (47 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fae4d6f1`
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
- ProfileDialog.tsx
- roomforge-wake.mjs
- src/types.ts
- nowIso
- index.ts
- integration.test.ts
- useRoomVoice.ts
- App
- XIcon
- connector/package.json
- RoomLanding.tsx
- auth.ts
- rooms.test.ts
- Icons.tsx
- RightPanel.tsx
- VoiceStage.tsx
- db.ts
- buildAgentProfile
- TasksPanel.tsx
- mapMessage
- PeoplePanel
- backup.mjs
- buildUserProfile
- devDependencies
- scripts
- PrincipalType
- RoomView.tsx
- RoomState
- TasksPanel
- getTask
- ref_node_crypto
- addRepo
- createTriggerEvent
- Sidebar.tsx
- ref_node_fs

## God Nodes (most connected - your core abstractions)
1. `RoomActions` - 46 edges
2. `Icon()` - 35 edges
3. `ChatPanel()` - 33 edges
4. `ArrowUpRightIcon()` - 33 edges
5. `BranchIcon()` - 30 edges
6. `App()` - 29 edges
7. `CheckIcon()` - 27 edges
8. `ProfilePage()` - 27 edges
9. `react` - 26 edges
10. `usePageMeta()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Public site` --references--> `usePageMeta()`  [INFERRED]
  README.md → web/src/lib/meta.ts
- `App()` --indirect_call--> `readSession()`  [INFERRED]
  web/src/App.tsx → web/src/lib/session.ts
- `AuthedRequest` --references--> `Principal`  [EXTRACTED]
  server/src/auth.ts → server/src/types.ts
- `attachHub()` --calls--> `resolveToken()`  [EXTRACTED]
  server/src/hub.ts → server/src/auth.ts
- `attachPendingJoin()` --calls--> `resolveToken()`  [EXTRACTED]
  server/src/hub.ts → server/src/auth.ts

## Import Cycles
- None detected.

## Communities (52 total, 5 thin omitted)

### Community 0 - "ProfilePage.tsx"
Cohesion: 0.07
Nodes (64): react, AgentGuide(), AgentGuidePage(), AgentGuideProps, CodeBlock(), SECTIONS, AuthScreen(), ArrowUpRightIcon() (+56 more)

### Community 1 - "store.ts"
Cohesion: 0.06
Nodes (9): leaveRoom(), listActivity(), listPendingJoinRequests(), mapActivity(), mapJoinRequest(), removeMember(), Row, triggerQueueStats (+1 more)

### Community 2 - "lib/types.ts"
Cohesion: 0.11
Nodes (34): AppProps, ApiError, request(), Activity, AgentProfile, AgentProfilePatch, CreateAgentResult, DeliveryMode (+26 more)

### Community 3 - "routes.ts"
Cohesion: 0.08
Nodes (33): HttpError, adminOrThrow(), agentAdminRoom(), agentCapabilitiesSchema, agentJoinSchema, agentProfilePatchSchema, agentTarget(), assertProfileHandle() (+25 more)

### Community 4 - "hub.ts"
Cohesion: 0.06
Nodes (77): agentMessageTimes, agentPresenceStatus(), agentSockets, attachHub(), attachPendingJoin(), broadcast(), broadcastJoinRequests(), broadcastMembers() (+69 more)

### Community 6 - "server/package.json"
Cohesion: 0.10
Nodes (19): express, tsx, @types/bcryptjs, @types/express, @types/jsonwebtoken, @types/node, @types/ws, dependencies (+11 more)

### Community 7 - "demo-agent.mjs"
Cohesion: 0.12
Nodes (19): handleLine(), interactive, presence, printPresence(), prompt(), queued, rl, socket (+11 more)

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
Cohesion: 0.12
Nodes (24): decryptSecret(), deliverDueTriggers(), deliverEvent(), DeliveryResult, ENCRYPTION_KEY, encryptSecret(), expireStaleWakes(), here (+16 more)

### Community 14 - "ChatPanel.tsx"
Cohesion: 0.13
Nodes (23): ChatPanel(), cancelEdit(), loadOlder(), saveEdit(), send(), startEdit(), startTyping(), stopTyping() (+15 more)

### Community 15 - "ProfileDialog.tsx"
Cohesion: 0.17
Nodes (21): SparkleIcon(), ProfileAvatar(), Draft, draftFrom(), handleIsValid(), ProfileDialog(), changePassword(), copyPublicLink() (+13 more)

### Community 16 - "roomforge-wake.mjs"
Cohesion: 0.16
Nodes (20): api(), buildPrompt(), catchUp(), [cmd, ...cmdArgs], cursor, enqueue(), handle(), HEADERS (+12 more)

### Community 17 - "src/types.ts"
Cohesion: 0.08
Nodes (23): TriggerEventRow, Activity, AgentProfile, AgentRuntime, AgentWakeState, JoinRequest, Member, Message (+15 more)

### Community 18 - "nowIso"
Cohesion: 0.10
Nodes (23): pickAvatar(), addMember(), allocateHandle(), approveJoinRequest(), createAgent(), createJoinRequest(), createRoom(), createUser() (+15 more)

### Community 19 - "index.ts"
Cohesion: 0.12
Nodes (18): zod, closeDb(), app, closeHub, here, port, requestMetrics, server (+10 more)

### Community 20 - "integration.test.ts"
Cohesion: 0.13
Nodes (11): api(), ApiOptions, createAgent(), freePort(), roomState(), RUN_ID, serverDir, startServer() (+3 more)

### Community 21 - "useRoomVoice.ts"
Cohesion: 0.15
Nodes (11): VoiceStageProps, VoiceParticipant, audioConstraints(), iceServers, micErrorMessage(), newPeerId(), PeerRecord, useRoomVoice() (+3 more)

### Community 22 - "App"
Cohesion: 0.18
Nodes (13): App(), copy(), handleAuth(), handleLogout(), handleProfileSaved(), showNotice(), submitNewRoom(), appendById() (+5 more)

### Community 23 - "XIcon"
Cohesion: 0.20
Nodes (11): GlobeIcon(), PlusIcon(), TrashIcon(), XIcon(), Modal(), ModalProps, ReposPanel(), addRepo() (+3 more)

### Community 24 - "connector/package.json"
Cohesion: 0.13
Nodes (14): bin, roomforge-wake, dependencies, ws, description, engines, node, ws (+6 more)

### Community 25 - "RoomLanding.tsx"
Cohesion: 0.18
Nodes (12): AuthScreenProps, Avatar(), AvatarProps, ProfileAvatarProps, LandingFooter(), RoomLandingProps, api, initial() (+4 more)

### Community 26 - "auth.ts"
Cohesion: 0.18
Nodes (13): bcryptjs, jsonwebtoken, AuthedRequest, clearSessionCookie(), hashAgentToken(), hashPassword(), newAgentToken(), readSessionToken() (+5 more)

### Community 27 - "rooms.test.ts"
Cohesion: 0.19
Nodes (7): handleValidationError(), normalizeHandle(), guest, guestPrincipal, owner, ownerPrincipal, profileHandleSchema

### Community 28 - "Icons.tsx"
Cohesion: 0.28
Nodes (12): ArrowLeftIcon(), BellIcon(), BellOffIcon(), CalendarIcon(), CodeIcon(), Icon(), IconProps, LightbulbIcon() (+4 more)

### Community 29 - "RightPanel.tsx"
Cohesion: 0.27
Nodes (9): ActivityIcon(), activityIcon(), LiveFeed(), LiveFeedProps, STATUS_CHOICES, RightPanel(), RightPanelProps, presenceMeta (+1 more)

### Community 30 - "VoiceStage.tsx"
Cohesion: 0.33
Nodes (11): HeadphonesIcon(), HeadphonesOffIcon(), MicIcon(), MicOffIcon(), PhoneOffIcon(), deviceName(), RemoteAudio(), RemoteAudioProps (+3 more)

### Community 31 - "db.ts"
Cohesion: 0.22
Nodes (9): addColumn(), backfillHandles(), dataDir, db, hasColumn(), here, isDbHealthy(), unsequenced (+1 more)

### Community 32 - "buildAgentProfile"
Cohesion: 0.18
Nodes (11): agentOwner(), buildAgentProfile(), getAgentProfile(), getAgentProfileByHandle(), getMembership(), getRoom(), getRoomByCode(), mapRoom() (+3 more)

### Community 33 - "TasksPanel.tsx"
Cohesion: 0.22
Nodes (8): FILTERS, GROUP_ORDER, TaskFilter, TasksPanelProps, clockTime(), roleMeta, taskMeta, TaskStatus

### Community 34 - "mapMessage"
Cohesion: 0.20
Nodes (10): deleteMessage(), findMessageByClientId(), getMessageById(), latestMessages(), listMessages(), listMessagesAfter(), listMessagesBeforeSeq(), mapMessage() (+2 more)

### Community 35 - "PeoplePanel"
Cohesion: 0.20
Nodes (4): PeoplePanel(), createAgent(), testTrigger(), requestedAt()

### Community 36 - "backup.mjs"
Cohesion: 0.22
Nodes (6): backupDir, db, here, source, stamp, target

### Community 37 - "buildUserProfile"
Cohesion: 0.22
Nodes (9): buildUserProfile(), findUserByHandle(), findUserById(), getUserProfile(), getUserProfileByHandle(), listUserCreatedAgents(), listUserProfileRooms(), profileRoom() (+1 more)

### Community 38 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, tsx, @types/bcryptjs, @types/express, @types/jsonwebtoken, @types/node, @types/ws, typescript

### Community 39 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, agent, backup, demo:agent, dev, start, test, typecheck

### Community 40 - "PrincipalType"
Cohesion: 0.29
Nodes (7): AgentProfileRow, InsertMessageOptions, JoinRequestRow, NewTaskInput, DeliveryMode, JoinRequestStatus, PrincipalType

### Community 41 - "RoomView.tsx"
Cohesion: 0.43
Nodes (5): MenuIcon(), PanelsIcon(), SlidersIcon(), PanelTab, RoomView()

### Community 42 - "RoomState"
Cohesion: 0.33
Nodes (6): ChatPanelProps, PeoplePanelProps, ReposPanelProps, RoomSettingsDialogProps, RoomViewProps, RoomState

### Community 43 - "TasksPanel"
Cohesion: 0.47
Nodes (6): splitPrincipal(), TasksPanel(), changeTask(), createTask(), reassign(), parsePaths()

### Community 44 - "getTask"
Cohesion: 0.40
Nodes (5): createTask(), getTask(), listTasks(), mapTask(), updateTaskFields()

### Community 46 - "addRepo"
Cohesion: 0.50
Nodes (4): addRepo(), getRepo(), listRepos(), mapRepo()

### Community 47 - "createTriggerEvent"
Cohesion: 0.50
Nodes (4): createTriggerEvent(), getTriggerEvent(), listDueTriggerEvents(), mapTriggerEvent()

### Community 48 - "Sidebar.tsx"
Cohesion: 0.83
Nodes (3): SidebarProps, RoomSummary, SessionUser

## Knowledge Gaps
- **13 isolated node(s):** `ws`, `concurrently`, `ws`, `@types/bcryptjs`, `@types/express` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 371 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `usePageMeta()` connect `ProfilePage.tsx` to `RoomForge Agent API`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `ws`, `concurrently`, `ws` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ProfilePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07368421052631578 - nodes in this community are weakly interconnected._
- **Why does `Public site` connect `RoomForge Agent API` to `ProfilePage.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05689900426742532 - nodes in this community are weakly interconnected._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1106612685560054 - nodes in this community are weakly interconnected._
- **Should `routes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07665505226480836 - nodes in this community are weakly interconnected._