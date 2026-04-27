# Context: @mention files and /<skills> flows explanation

## Discovery
Explored codebase to understand how @mention file references and /<skills> slash commands are implemented in the jean Tauri React application.

## Implementation
Identified key files and lines responsible for both features:

### @Mention File Handling
- Detection: src/components/chat/ChatInput.tsx:243,687 (regex /@(\\S+)/g)
- Extraction: src/components/chat/message-content-utils.ts:59-69 (extractFileMentionPaths, extractDirectoryMentionPaths)
- UI Display: src/components/chat/MessageItem.tsx:25,48-49,69,173,178-181,281-293,302
- Prompt Processing: src-tauri/src/chat/naming.rs:97-98,235-236,304-305,337-344,373,404,407,422-423,426
- State Management: src/store/chat-store.ts:186,189,484,490,2043,2089

### /<skills> Command Processing
- Detection: src/components/chat/ChatInput.tsx:94,325,943
- UI: src-components/chat/SlashPopover.tsx:19,124,248
- Backend: src-tauri/src/projects/commands.rs:9106-9117,9297-9300,9309,9328-9329,9343,9352,9354,9356,9420-9442,9445-9459,9462,9465,9468-9469,9486,9488-9544,9564,9566-9567,9569,9577-9578,9580,9582,9586
- API: src-tauri/src/http_server/dispatch.rs:1381,1383,1385,1393,1394,1397,1398
- State: src/store/chat-store.ts:13,176,189,190,463,490-494,696,1953-1957,2089-2113
- Helpers: src/services/skills.ts:37,54,85,97,147-148,168

## Validation
Confirmed that both systems follow a consistent pattern: frontend detection → state storage in chat store → UI presentation → backend processing → result return. The @mention system focuses on file reference extraction and prompt inclusion, while the /skills system handles command routing to specialized AI agents.

## Key Insight
Both flows rely on the chat store as central state manager and use TypeScript/Rust coordination for frontend-backend communication, demonstrating the application's consistent architectural patterns.