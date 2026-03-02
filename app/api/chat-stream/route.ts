import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
export async function POST(request) {
  try {
    const { message } = await request.json();

    const responseStream = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: message }],
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of responseStream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(delta)}`),
            );
          }
        }
        controller.close();
      },
    });

    // after the client receives first delta of stream response we need to tell it to keep the connection open so it could receive the whole stream
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to process request",
      },
      {
        status: 500,
      },
    );
  }
}
