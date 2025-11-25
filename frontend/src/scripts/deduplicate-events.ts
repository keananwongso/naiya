/**
 * Deduplicate Events Script
 *
 * This script removes duplicate calendar events from Supabase.
 * Two events are considered duplicates if they have the same:
 * - title
 * - day (for recurring) OR date (for one-time)
 * - start time
 * - end time
 */

import { loadCalendar, saveCalendar } from '../lib/calendar-db';
import { CalendarEvent } from 'shared/types';

async function deduplicateEvents() {
  console.log('🔍 Loading calendar from Supabase...');
  const events = await loadCalendar();

  console.log(`📊 Found ${events.length} total events`);

  if (events.length === 0) {
    console.log('✅ No events to deduplicate!');
    return;
  }

  // Track unique events by their signature
  const uniqueEvents = new Map<string, CalendarEvent>();
  const duplicates: CalendarEvent[] = [];

  for (const event of events) {
    // Create a unique signature for the event
    const signature = [
      event.title.toLowerCase().trim(),
      event.day || event.date || 'no-time',
      event.start,
      event.end,
    ].join('|');

    if (uniqueEvents.has(signature)) {
      // This is a duplicate
      duplicates.push(event);
      console.log(`❌ Duplicate found: ${event.title} on ${event.day || event.date} at ${event.start}-${event.end}`);
    } else {
      // This is unique, keep it
      uniqueEvents.set(signature, event);
    }
  }

  const deduplicatedEvents = Array.from(uniqueEvents.values());

  console.log(`\n📊 Summary:`);
  console.log(`   Original events: ${events.length}`);
  console.log(`   Unique events: ${deduplicatedEvents.length}`);
  console.log(`   Duplicates removed: ${duplicates.length}`);

  if (duplicates.length === 0) {
    console.log('\n✅ No duplicates found! Calendar is clean.');
    return;
  }

  console.log('\n💾 Saving deduplicated calendar to Supabase...');
  await saveCalendar(deduplicatedEvents);

  console.log('✅ Deduplication complete!');
  console.log(`\n📋 Remaining events:`);
  deduplicatedEvents.forEach((event, idx) => {
    const timeInfo = event.day ? `${event.day} ${event.start}-${event.end}` : `${event.date} ${event.start}-${event.end}`;
    console.log(`   ${idx + 1}. ${event.title} - ${timeInfo}`);
  });
}

// Run the script
deduplicateEvents()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
