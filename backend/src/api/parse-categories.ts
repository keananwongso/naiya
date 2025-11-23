import { parseCategories } from "../lib/llm/parseCategories";

export async function handleParseCategories(req: Request) {
    const { text } = await req.json();
    const result = await parseCategories(text);
    return Response.json(result);
}
