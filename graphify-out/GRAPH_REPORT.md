# Graph Report - RoomForge  (2026-10-25)

## Corpus Check
- 87 files · ~106,377 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .css 3, (none) 1)

## Summary
- 1234 nodes · 3050 edges · 55 communities (52 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `969345d9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.tsx
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
- RoomForge
- trigger.ts
- ChatPanel.tsx
- ProfileDialog.tsx
- roomforge-wake.mjs
- src/types.ts
- nowIso
- index.ts
- integration.test.ts
- VoiceStage.tsx
- PeoplePanel.tsx
- CheckIcon
- connector/package.json
- Icons.tsx
- roomforge-claude.mjs
- rooms.test.ts
- mission-routes.ts
- src/avatars.ts
- mission.ts
- db.ts
- buildAgentProfile
- BranchIcon
- roomforge-mcp.mjs
- RoomView.tsx
- FormattedMessage.tsx
- App
- auth.ts
- RoomForge Agent API
- readSession
- MissionPanel.tsx
- RoomState
- MissionPanel
- 10. Mission, questions, and decisions
- Collaboration architecture
- createRoom
- RoomLanding.tsx
- 12. Sleep and wake (trigger mode)
- 9. Work with tasks
- WorkspaceTab
- 5. Endpoint reference
- Agent API

## God Nodes (most connected - your core abstractions)
1. `RoomActions` - 60 edges
2. `CheckIcon()` - 42 edges
3. `ChatPanel()` - 38 edges
4. `Icon()` - 38 edges
5. `ArrowUpRightIcon()` - 35 edges
6. `App()` - 33 edges
7. `CopyIcon()` - 32 edges
8. `HttpError` - 31 edges
9. `react` - 31 edges
10. `RoomState` - 31 edges

## Surprising Connections (you probably didn't know these)
- `WebSocket` --references--> `roomId()`  [INFERRED]
  README.md → connector/roomforge-mcp.mjs
- `Public site` --references--> `usePageMeta()`  [INFERRED]
  README.md → web/src/lib/meta.ts
- `10. Mission, questions, and decisions` --references--> `decide()`  [INFERRED]
  docs/agent-api.md → web/src/components/PeoplePanel.tsx
- `The collaboration loop` --references--> `decide()`  [INFERRED]
  docs/collaboration-architecture.md → web/src/components/PeoplePanel.tsx
- `What everyone sees live` --references--> `decide()`  [INFERRED]
  README.md → web/src/components/PeoplePanel.tsx

## Import Cycles
- None detected.

## Communities (55 total, 3 thin omitted)

### Community 0 - "main.tsx"
Cohesion: 0.09
Nodes (42): AgentGuide(), AgentGuidePage(), AgentGuideProps, CodeBlock(), SECTIONS, ArrowUpRightIcon(), ChatIcon(), ShieldIcon() (+34 more)

### Community 1 - "store.ts"
Cohesion: 0.04
Nodes (40): addRepo(), buildUserProfile(), createTriggerEvent(), deleteMessage(), findMessageByClientId(), findTaskByClientId(), findUserByHandle(), findUserById() (+32 more)

### Community 2 - "lib/types.ts"
Cohesion: 0.08
Nodes (53): AppProps, MemberProfileDialogProps, Activity, AgentProfile, AgentProfilePatch, CreateAgentResult, Decision, DecisionCloseInput (+45 more)

### Community 3 - "routes.ts"
Cohesion: 0.07
Nodes (23): missionRouter, agentCapabilitiesSchema, agentJoinSchema, agentProfilePatchSchema, authAttempts, checkJoinRate(), handleAgentJoin(), joinAttempts (+15 more)

### Community 4 - "hub.ts"
Cohesion: 0.06
Nodes (74): agentMessageLimiter, agentPresenceStatus(), agentSockets, attachHub(), attachPendingJoin(), broadcast(), broadcastJoinRequests(), broadcastMembers() (+66 more)

### Community 6 - "server/package.json"
Cohesion: 0.05
Nodes (37): bcryptjs, express, jsonwebtoken, tsx, @types/bcryptjs, @types/express, @types/jsonwebtoken, @types/node (+29 more)

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

### Community 12 - "RoomForge"
Cohesion: 0.15
Nodes (11): Backups, Configuration, Connect an agent, Observability and maintenance, Project layout, Public site, Quick start, Roles (+3 more)

### Community 13 - "trigger.ts"
Cohesion: 0.11
Nodes (26): decryptSecret(), deliverDueTriggers(), deliverEvent(), DeliveryResult, ENCRYPTION_KEY, encryptSecret(), expireStaleWakes(), here (+18 more)

### Community 14 - "ChatPanel.tsx"
Cohesion: 0.11
Nodes (23): ChatPanel(), cancelEdit(), loadOlder(), saveEdit(), send(), startEdit(), startTyping(), stopTyping() (+15 more)

### Community 15 - "ProfileDialog.tsx"
Cohesion: 0.10
Nodes (37): CalendarIcon(), CameraIcon(), PinIcon(), SparkleIcon(), ProfileAvatar(), Draft, draftFrom(), handleIsValid() (+29 more)

### Community 16 - "roomforge-wake.mjs"
Cohesion: 0.17
Nodes (20): api(), buildPrompt(), catchUp(), [cmd, ...cmdArgs], cursor, enqueue(), handle(), HEADERS (+12 more)

### Community 17 - "src/types.ts"
Cohesion: 0.07
Nodes (36): CreateRoomMessageInput, NewQuestionInput, QuestionPatch, AgentProfileRow, InsertMessageOptions, JoinRequestRow, NewTaskInput, TaskPageQuery (+28 more)

### Community 18 - "nowIso"
Cohesion: 0.10
Nodes (23): pickAvatar(), addMember(), allocateHandle(), approveJoinRequest(), createAgent(), createJoinRequest(), createTask(), createUser() (+15 more)

### Community 19 - "index.ts"
Cohesion: 0.13
Nodes (18): zod, closeDb(), app, closeHub, here, port, requestMetrics, server (+10 more)

### Community 20 - "integration.test.ts"
Cohesion: 0.12
Nodes (13): api(), ApiOptions, createAgent(), freePort(), openWs(), openWsWithInbox(), roomState(), RUN_ID (+5 more)

### Community 21 - "VoiceStage.tsx"
Cohesion: 0.15
Nodes (11): VoiceStageProps, VoiceParticipant, audioConstraints(), iceServers, micErrorMessage(), newPeerId(), PeerRecord, useRoomVoice() (+3 more)

### Community 22 - "PeoplePanel.tsx"
Cohesion: 0.15
Nodes (12): react, GlobeIcon(), TrashIcon(), Modal(), ModalProps, PeoplePanel(), createAgent(), testTrigger() (+4 more)

### Community 23 - "CheckIcon"
Cohesion: 0.21
Nodes (11): ArrowLeftIcon(), CheckIcon(), CopyIcon(), HashIcon(), PencilIcon(), SearchIcon(), LinkifyText(), MemberProfileDialog() (+3 more)

### Community 24 - "connector/package.json"
Cohesion: 0.12
Nodes (16): bin, roomforge-mcp, roomforge-wake, dependencies, ws, description, engines, node (+8 more)

### Community 25 - "Icons.tsx"
Cohesion: 0.21
Nodes (21): BellOffIcon(), CodeIcon(), FlagIcon(), HeadphonesIcon(), HeadphonesOffIcon(), Icon(), IconProps, MenuIcon() (+13 more)

### Community 26 - "roomforge-claude.mjs"
Cohesion: 0.16
Nodes (18): api(), askClaude(), BASE, buildPrompt(), catchUp(), CATCHUP_MAX_AGE_MS, connect(), cursor (+10 more)

### Community 27 - "rooms.test.ts"
Cohesion: 0.18
Nodes (7): handleValidationError(), normalizeHandle(), guest, guestPrincipal, owner, ownerPrincipal, profileHandleSchema

### Community 28 - "mission-routes.ts"
Cohesion: 0.08
Nodes (27): HttpError, HttpErrorOptions, adminOrThrow(), DECISION_METHODS, decisionCloseSchema, decisionCreateSchema, emitFamily(), emitFamilyForMutation() (+19 more)

### Community 29 - "src/avatars.ts"
Cohesion: 0.38
Nodes (5): AVATAR_COUNT, isAvatarId(), isAvatarValue(), isCustomAvatar(), MAX_AVATAR_LENGTH

### Community 30 - "mission.ts"
Cohesion: 0.08
Nodes (39): castVote(), CONSENT_CHOICES, createDecision(), createQuestion(), DecisionOutcomeInput, dependenciesFor(), getDecision(), getFamilyView() (+31 more)

### Community 31 - "db.ts"
Cohesion: 0.11
Nodes (16): ws, backupDir, db, here, source, stamp, target, addColumn() (+8 more)

### Community 32 - "buildAgentProfile"
Cohesion: 0.18
Nodes (12): agentOwner(), buildAgentProfile(), getAgentProfile(), getAgentProfileByHandle(), getMembership(), getRoom(), getRoomByCode(), listMembers() (+4 more)

### Community 33 - "BranchIcon"
Cohesion: 0.11
Nodes (27): Avatar(), LightbulbIcon(), PanelsIcon(), LiveFeed(), STATUS_CHOICES, isLiveEntry(), LIVE_STATUSES, RoomCockpit() (+19 more)

### Community 34 - "roomforge-mcp.mjs"
Cohesion: 0.17
Nodes (28): api(), baseUrl, BridgeError, closeDecision(), createQuestion(), createTask(), createWorkstream(), getContext() (+20 more)

### Community 35 - "RoomView.tsx"
Cohesion: 0.19
Nodes (15): ActivityIcon(), BellIcon(), BotIcon(), BranchIcon(), CompassIcon(), PlusIcon(), UsersIcon(), activityIcon() (+7 more)

### Community 36 - "FormattedMessage.tsx"
Cohesion: 0.36
Nodes (6): CodeBlock(), escapeRegExp(), FormattedMessage(), FormattedMessageProps, MentionTarget, renderInlineText()

### Community 37 - "App"
Cohesion: 0.16
Nodes (11): App(), copy(), handleAuth(), handleLogout(), handleProfileSaved(), showNotice(), submitNewRoom(), appendById() (+3 more)

### Community 38 - "auth.ts"
Cohesion: 0.17
Nodes (14): AuthedRequest, clearSessionCookie(), hashAgentToken(), hashPassword(), newAgentToken(), readSessionToken(), requireAuth(), resolveToken() (+6 more)

### Community 39 - "RoomForge Agent API"
Cohesion: 0.14
Nodes (14): 11. Real-time over WebSocket, 13. MCP bridge, 14. Roles and limits, 15. Errors, 1. Get connected (two paths), 2. Join a room with a code (admin approval), 3. Base URL and headers, 4. Find your room (+6 more)

### Community 40 - "readSession"
Cohesion: 0.27
Nodes (9): AuthScreen(), AuthScreenProps, api, readSession(), saveSession(), Session, AuthPage(), handleAuth() (+1 more)

### Community 41 - "MissionPanel.tsx"
Cohesion: 0.18
Nodes (11): DecisionCard(), methodMeta(), METHODS, MissionPanelProps, PHASE_LABEL, PHASES, QuestionCardProps, voteLabel() (+3 more)

### Community 42 - "RoomState"
Cohesion: 0.19
Nodes (16): AvatarProps, ChatPanelProps, LiveFeedProps, DecisionCardProps, PeoplePanelProps, ProfileAvatarProps, ReposPanelProps, RightPanelProps (+8 more)

### Community 43 - "MissionPanel"
Cohesion: 0.20
Nodes (4): MissionPanel(), QuestionCard(), take(), update()

### Community 44 - "10. Mission, questions, and decisions"
Cohesion: 0.20
Nodes (10): 10. Mission, questions, and decisions, Ask and answer before tasks exist, Open and close a decision, Split into workstreams, Context pack, Objects, The collaboration loop, Workstreams (+2 more)

### Community 45 - "Collaboration architecture"
Cohesion: 0.20
Nodes (9): Collaboration architecture, Decision rules, Design principles, Entry paths, Governance and trust, Implementation map, Liveness and consistency, Purpose (+1 more)

### Community 46 - "createRoom"
Cohesion: 0.28
Nodes (9): ensureMission(), getMission(), mapMission(), updateMission(), createRoom(), createWorkstreamRoom(), leaveRoom(), newRoomCode() (+1 more)

### Community 47 - "RoomLanding.tsx"
Cohesion: 0.25
Nodes (6): LandingFooter(), RoomLandingProps, ApiError, request(), JoinState, RoomPreview

### Community 48 - "12. Sleep and wake (trigger mode)"
Cohesion: 0.40
Nodes (5): 12. Sleep and wake (trigger mode), Configure, Wake, catch up, reply, sleep, Wake connector, What RoomForge sends

### Community 49 - "9. Work with tasks"
Cohesion: 0.50
Nodes (4): 9. Work with tasks, Claim and update a task, Create a task, Find tasks

### Community 52 - "WorkspaceTab"
Cohesion: 0.50
Nodes (4): SidebarProps, RoomSummary, SessionUser, WorkspaceTab

### Community 53 - "5. Endpoint reference"
Cohesion: 0.67
Nodes (3): 5. Endpoint reference, Admin / management, Agent essentials

### Community 54 - "Agent API"
Cohesion: 0.67
Nodes (3): Agent API, REST, WebSocket

## Knowledge Gaps
- **13 isolated node(s):** `ws`, `concurrently`, `ws`, `@types/bcryptjs`, `@types/express` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 473 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `roomId()` connect `roomforge-mcp.mjs` to `db.ts`, `integration.test.ts`, `Agent API`, `demo-agent.mjs`?**
  _High betweenness centrality (0.482) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `CheckIcon()` (e.g. with `AboutPage.tsx` and `HomePage.tsx`) actually correct?**
  _`CheckIcon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ws`, `concurrently`, `ws` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08960573476702509 - nodes in this community are weakly interconnected._
- **Why does `RoomForge` connect `RoomForge` to `10. Mission, questions, and decisions`, `Agent API`?**
  _High betweenness centrality (0.453) - this node is a cross-community bridge._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03983903420523139 - nodes in this community are weakly interconnected._
- **Why does `Agent API` connect `Agent API` to `RoomForge`?**
  _High betweenness centrality (0.446) - this node is a cross-community bridge._