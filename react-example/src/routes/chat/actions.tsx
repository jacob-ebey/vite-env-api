"use server";

import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { parseWithZod } from "@conform-to/zod";
import { createStreamableUI } from "ai/rsc";

import * as framework from "framework";

import { actionRequiresUserId } from "../../middleware/user/server";
import { GROQ_API_KEY } from "../../middleware/secrets/server";
import { sendMessageSchema } from "./schema";
import { AIMessage, PendingAIMessage, UserMessage } from "./shared";

export async function sendMessage(formData: FormData, stream = false) {
  const apiKey = framework.get(GROQ_API_KEY);
  const userId = await actionRequiresUserId();

  const parsed = await parseWithZod(formData, {
    schema: sendMessageSchema,
  });

  switch (parsed.status) {
    case "error": {
      return { lastResult: parsed.reply(), stream };
    }
    case "success": {
      const { message } = parsed.value;

      const groq = new ChatGroq({
        apiKey,
        model: "llama3-70b-8192",
      });

      const aiMessage = createStreamableUI(<PendingAIMessage />);
      const userMessage = createStreamableUI(
        <UserMessage>{message}</UserMessage>
      );

      setTimeout(async () => {
        try {
          const stream = await ChatPromptTemplate.fromMessages([
            ["system", "You are a helpful AI assistant."],
            ["human", "{message}"],
          ])
            .pipe(groq)
            .stream({
              message,
            });

          let aiResponse = "";
          for await (const chunk of stream) {
            if (typeof chunk.content === "string" && chunk.content) {
              aiResponse += chunk.content;
              const trimmed = aiResponse.trim();
              if (trimmed) {
                aiMessage.update(<AIMessage>{trimmed}</AIMessage>);
              }
            }
          }

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
          userMessage.done();
        }
      }, 1000);

      return {
        lastResult: parsed.reply(),
        newMessages: [userMessage.value, aiMessage.value],
        stream,
      };
    }
  }
}
