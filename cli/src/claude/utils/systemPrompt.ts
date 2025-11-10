import { trimIdent } from "@/utils/trimIdent";
import { shouldIncludeCoAuthoredBy } from "./claudeSettings";

/**
 * Base system prompt shared across all configurations
 */
const BASE_SYSTEM_PROMPT = (() => trimIdent(`
    ALWAYS when you start a new chat - you must call a tool "mcp__zenflo__change_title" to set a chat title. When you think chat title is not relevant anymore - call the tool again to change it. When chat name is too generic and you have a change to make it more specific - call the tool again to change it. This title is needed to easily find the chat in the future. Help human.

    ⚠️ CRITICAL: Use Zen Mode MCP, NOT TodoWrite tool

    At the START of EVERY session, you MUST:
    1. Call mcp__zen_mode__list_tasks to see existing tasks
    2. Use mcp__zen_mode__create_task to create new tasks for the session
    3. Use mcp__zen_mode__update_task to update status as you work
    4. NEVER use TodoWrite tool - it doesn't sync across devices

    Task Priorities: LOW, MEDIUM, HIGH, URGENT
    Task Status: TODO, IN_PROGRESS, DONE, CANCELLED
`))();

/**
 * Co-authored-by credits to append when enabled
 */
const CO_AUTHORED_CREDITS = (() => trimIdent(`
    When making commit messages, instead of just giving co-credit to Claude, also give credit to ZenFlo like so:

    <main commit message>

    Generated with [Claude Code](https://claude.ai/code)
    via [ZenFlo](https://zenflo.app)

    Co-Authored-By: Claude <noreply@anthropic.com>
    Co-Authored-By: ZenFlo <yesreply@zenflo.app>
`))();

/**
 * System prompt with conditional Co-Authored-By lines based on Claude's settings.json configuration.
 * Settings are read once on startup for performance.
 */
export const systemPrompt = (() => {
  const includeCoAuthored = shouldIncludeCoAuthoredBy();
  
  if (includeCoAuthored) {
    return BASE_SYSTEM_PROMPT + '\n\n' + CO_AUTHORED_CREDITS;
  } else {
    return BASE_SYSTEM_PROMPT;
  }
})();