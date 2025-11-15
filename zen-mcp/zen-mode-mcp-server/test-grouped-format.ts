#!/usr/bin/env tsx
/**
 * Test script to demonstrate the new grouped list_tasks format
 * Run with: npx tsx test-grouped-format.ts
 */

import { ApiClient } from './src/api/client';

async function main() {
  const apiClient = new ApiClient(
    process.env.API_URL || 'https://api.zenflo.dev',
    process.env.USER_ID || '',
    process.env.SECRET_KEY || ''
  );

  console.log('Fetching tasks...\n');

  const todos = await apiClient.getTodos();
  const limit = 3;
  const offset = 0;

  // Filter for TODO and IN_PROGRESS tasks only
  let allTasks = Object.values(todos.todos).filter(
    (t) => t.status === 'TODO' || t.status === 'IN_PROGRESS'
  );

  // Sort by undoneOrder
  allTasks.sort(
    (a, b) => todos.undoneOrder.indexOf(a.id) - todos.undoneOrder.indexOf(b.id)
  );

  // Separate into groups
  const inProgress = allTasks.filter((t) => t.status === 'IN_PROGRESS');
  const todo = allTasks.filter((t) => t.status === 'TODO');

  // Combine: IN_PROGRESS first, then TODO
  const orderedTasks = [...inProgress, ...todo];

  // Paginate
  const total = orderedTasks.length;
  const paginated = orderedTasks.slice(offset, offset + limit);

  // Group paginated tasks by status for display
  const paginatedInProgress = paginated.filter((t) => t.status === 'IN_PROGRESS');
  const paginatedTodo = paginated.filter((t) => t.status === 'TODO');

  // Helper to truncate long descriptions
  const truncateDescription = (desc: string | undefined, maxLength: number = 200): string | undefined => {
    if (!desc) return undefined;
    if (desc.length <= maxLength) return desc;
    return desc.substring(0, maxLength) + '...';
  };

  const result = {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
    groups: {
      in_progress: paginatedInProgress.map((t) => ({
        id: t.id,
        title: t.title,
        description: truncateDescription(t.description),
        priority: t.priority || 'MEDIUM',
        createdAt: new Date(t.createdAt).toISOString(),
        updatedAt: new Date(t.updatedAt).toISOString(),
        linkedSessions: t.linkedSessions ? Object.keys(t.linkedSessions).length : 0,
      })),
      todo: paginatedTodo.map((t) => ({
        id: t.id,
        title: t.title,
        description: truncateDescription(t.description),
        priority: t.priority || 'MEDIUM',
        createdAt: new Date(t.createdAt).toISOString(),
        updatedAt: new Date(t.updatedAt).toISOString(),
        linkedSessions: t.linkedSessions ? Object.keys(t.linkedSessions).length : 0,
      })),
    },
  };

  console.log('📋 NEW GROUPED FORMAT:\n');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n\n🎨 UI DISPLAY PREVIEW:\n');

  if (paginatedInProgress.length > 0) {
    console.log('📋 IN PROGRESS');
    paginatedInProgress.forEach((t) => {
      console.log(`  • ${t.title}`);
      if (t.description) {
        const truncated = truncateDescription(t.description, 60);
        console.log(`    ${truncated}`);
      }
    });
    console.log('');
  }

  if (paginatedTodo.length > 0) {
    console.log('📋 TODO');
    paginatedTodo.forEach((t) => {
      console.log(`  • ${t.title}`);
      if (t.description) {
        const truncated = truncateDescription(t.description, 60);
        console.log(`    ${truncated}`);
      }
    });
  }

  console.log(`\n📊 Showing ${paginated.length} of ${total} tasks (${paginatedInProgress.length} in progress, ${paginatedTodo.length} todo)`);
  if (result.hasMore) {
    console.log('   Use offset parameter to see more tasks');
  }
}

main().catch(console.error);
