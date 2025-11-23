import { planWeek } from "../lib/llm/planWeek";

export async function handlePlanWeek(req: Request) {
    const buckets = await req.json();
    const result = await planWeek(buckets);
    return Response.json(result);
}
