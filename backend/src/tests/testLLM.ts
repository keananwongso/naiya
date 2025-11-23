import { config } from "dotenv";
config();

import { parseCategories } from "@/src/lib/llm/parseCategories";
import { planWeek } from "@/src/lib/llm/planWeek";
import { updateCalendar } from "@/src/lib/llm/updateCalendar";

async function run() {
    console.log("\n=== TEST parseCategories ===");
    const parsed = await parseCategories(
        "I have MATH 100 on Mon Wed Fri at 10, chem midterm next Friday, gym Tue/Thu at 7."
    );
    console.log(JSON.stringify(parsed, null, 2));

    console.log("\n=== TEST planWeek ===");
    const planned = await planWeek(parsed);
    console.log("Assistant Message:", planned.assistant_message);
    console.log("Events:", JSON.stringify(planned.calendar.events, null, 2));

    console.log("\n=== TEST updateCalendar ===");
    const updated = await updateCalendar(
        planned.calendar.events,
        "Move my Wednesday study session earlier."
    );
    console.log("Assistant Message:", updated.assistant_message);
    console.log("Updated Events:", JSON.stringify(updated.calendar.events, null, 2));
}

run();
