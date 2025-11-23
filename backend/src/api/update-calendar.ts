import { updateCalendar } from "../lib/llm/updateCalendar";

export async function handleUpdateCalendar(req: Request) {
    const { events, message } = await req.json();
    const result = await updateCalendar(events, message);
    return Response.json(result);
}
