import Anthropic from "@anthropic-ai/sdk";

// Клієнт живе лише на сервері — API ключ ніколи не потрапляє у браузер
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function streamChat(messages: { role: "user" | "assistant"; content: string }[]) {
  return anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages,
  });
}
