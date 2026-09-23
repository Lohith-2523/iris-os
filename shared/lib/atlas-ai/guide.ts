export const ATLAS_GUIDE_SESSION_ID = 'atlas-guide';
export const ATLAS_GUIDE_TITLE = 'How Miles works';

export const ATLAS_GUIDE_MESSAGES = [
  {
    role: 'assistant' as const,
    content: `# Welcome to Miles

Miles is the intelligence and action layer inside IrisOS. It can answer questions about your connected workspace, explain what needs attention, and turn a request into structured work.

Miles uses only the organization data and features your account is permitted to access. Available actions can vary by workspace plan, role, enabled AI consent, and connected services.`,
  },
  {
    role: 'assistant' as const,
    content: `## What you can ask Miles

- **Clients:** summarize client health, renewals, risks, opportunities, and recent activity.
- **Projects and delivery:** review progress, blocked work, deadlines, staffing, and delivery risk.
- **Tasks and operations:** identify priorities, bottlenecks, ownership gaps, and recommended next actions.
- **Finance:** analyze invoices, expenses, cash flow, margins, forecasts, and possible profit leaks.
- **Reporting:** prepare executive summaries, financial or marketing briefs, and decision-ready talking points.
- **Strategy:** compare options, organize a plan, explain tradeoffs, and recommend an evidence-based course of action.

Try a specific request such as **"Which active projects are at risk, why, and what should I do first?"** Specific questions usually produce the most useful answer.`,
  },
  {
    role: 'assistant' as const,
    content: `## What Miles can create

Miles can guide supported workflows for **projects, tasks, invoices, reports, and meetings**. Describe the outcome in normal language; Miles will collect any required details that are missing.

Before changing workspace data, Miles shows a structured summary. At that point:

- Reply **Confirm** to approve the exact action shown.
- Tell Miles what to change to revise the draft before approval.
- Reply **Cancel** to stop the workflow without creating anything.

For example: **"Create a task called Review launch creative in the Nova campaign, assign it to Maya, and make it due Friday."** Miles may ask you to clarify the project, assignee, or date before presenting the confirmation summary. Meeting creation can also create a calendar event and send invitations when the required integration is available.`,
  },
  {
    role: 'assistant' as const,
    content: `## Chat and navigation buttons

- **New Chat** - starts a clean conversation. Use it when you are changing topics or beginning a different workflow.
- **How Miles works (pinned)** - opens this permanent guide. It is a reference conversation and cannot be renamed or deleted.
- **Chat history item** - opens that saved conversation so you can review it or continue with its existing context.
- **Pencil icon** - renames a saved chat. Press **Enter** or click away to save; press **Escape** to discard the edit.
- **Trash icon** - permanently deletes the selected saved chat from your history.

Starting a request while this guide is open automatically creates a normal conversation; the pinned guide itself stays unchanged.`,
  },
  {
    role: 'assistant' as const,
    content: `## Composer and quick-action buttons

- **Suggested query buttons** - appear at the beginning of a new chat. Selecting one sends that request immediately, so use it as a fast workflow starter.
- **Microphone button** - begins voice capture. Your words appear in the message field, where you can review and edit them before sending.
- **Square stop button** - replaces the microphone while recording. Select it to stop and finish the transcription.
- **Voice conversation button** - opens a live, hands-free conversation. Miles detects when you finish speaking, adds your question to the conversation, replies aloud, and keeps listening. Speak while Miles is replying to interrupt naturally.
- **Send button (arrow)** - sends the text currently in the message field. It is unavailable when the field is empty or Miles is already responding.

Button styles communicate purpose: labeled outline buttons start broad actions, compact icon buttons manage one nearby item, suggestion chips submit a ready-made prompt, and the solid send button is the primary action. Always check a button's label or tooltip before selecting a destructive icon such as **Delete**.`,
  },
  {
    role: 'assistant' as const,
    content: `## How conversations and approvals work

Miles remembers the messages in the selected saved chat, which makes follow-up requests such as **"make the deadline next Tuesday"** useful during an active workflow. Start a new chat when that earlier context should not carry forward.

An Miles response can be one of three broad kinds:

1. **Answer or analysis** - explains workspace information and recommends next steps; it does not change records.
2. **Clarifying question or draft** - gathers details and prepares an action; nothing has been created yet.
3. **Confirmation summary** - lists the exact proposed change and waits for **Confirm**, a revision, or **Cancel**.

After a successful confirmed action, Miles reports what it created. If Miles asks for confirmation, review names, dates, recipients, money amounts, tax, and scope carefully before approving.`,
  },
  {
    role: 'assistant' as const,
    content: `## Access, plans, and good prompting

- Miles respects your IrisOS role and organization boundary; it does not provide access to records you cannot normally view.
- Workspace analysis depends on AI data-sharing consent being enabled. Without it, Miles remains in reasoning-only mode and cannot analyze private business data.
- **Pro** workspaces support Miles meeting and invoice actions. **Advanced** workspaces support the full action set, including projects, tasks, reports, and decision workflows.
- Results depend on the data currently stored in IrisOS and the availability of connected providers such as calendar services.

For better results, include the **goal, record or client, timeframe, constraints, and desired output**. Example: **"Review cash flow for the next 60 days, flag overdue invoices above INR 50,000, and give me the three highest-priority actions."**`,
  },
] as const;
