"use server";

import { createOpenAI } from "@ai-sdk/openai";
import { parseWithZod } from "@conform-to/zod";
import { createStreamableUI } from "ai/rsc";
import * as React from "react";

import * as framework from "framework";

import { actionRequiresUserId } from "../../middleware/user/server";
import { GROQ_API_KEY } from "../../middleware/secrets/server";
import { sendMessageSchema } from "./schema";
import { AIMessage, PendingAIMessage, UserMessage } from "./shared";

export async function sendMessage(formData: FormData, stream?: true) {
  const apiKey = framework.get(GROQ_API_KEY);
  const userId = await actionRequiresUserId();

  const parsed = await parseWithZod(formData, {
    schema: sendMessageSchema,
  });

  switch (parsed.status) {
    case "error": {
      return { lastResult: parsed.reply() };
    }
    case "success": {
      const { message } = parsed.value;

      const groq = createOpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
      });

      const aiMessage = createStreamableUI(<PendingAIMessage />);
      const userMessage = createStreamableUI(
        <UserMessage>{message}</UserMessage>
      );

      setTimeout(async () => {
        try {
          const { stream } = await groq("llama3-70b-8192").doStream({
            inputFormat: "messages",
            mode: {
              type: "regular",
            },
            prompt: [
              {
                role: "system",
                content: "You are a helpful AI assistant.",
              },
              {
                role: "user",
                content: [{ type: "text", text: message }],
              },
            ],
          });
          let aiResponse = "";
          await stream.pipeTo(
            new WritableStream({
              write(chunk) {
                switch (chunk.type) {
                  case "text-delta": {
                    aiResponse += chunk.textDelta;
                    const trimmed = aiResponse.trim();
                    if (trimmed) {
                      aiMessage.update(<AIMessage>{trimmed}</AIMessage>);
                    }
                    break;
                  }
                }
              },
            })
          );
          aiMessage.done(<AIMessage>{aiResponse.trim()}</AIMessage>);
          userMessage.done();
        } catch (reason) {
          console.error(reason);
          aiMessage.done(
            <AIMessage>
              Sorry, I'm having trouble processing your message. Please try
              again.
            </AIMessage>
          );
          userMessage.done(<React.Fragment />);
        }
      }, 1000);

      return {
        lastResult: parsed.reply(),
        newMessages: [aiMessage.value, userMessage.value],
        stream,
      };
    }
  }
}
