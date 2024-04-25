"use server";

import { parseWithZod } from "@conform-to/zod";
import type { BaseMessagePromptTemplateLike } from "@langchain/core/prompts";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { createStreamableUI } from "ai/rsc";
import { and, eq } from "drizzle-orm";

import * as framework from "framework";

import { ClientRedirect } from "@/components/client-redirect";
import { chat, chatMessage } from "@/db/schema";
import { getDB } from "@/db/server";
import { actionRequiresUserId } from "@/user/server";
import { Secrets } from "@/secrets/server";

import { FocusSendMessageForm } from "./client";
import { sendMessageSchema } from "./schema";
import {
  AIMessage,
  PendingAIMessage,
  RetryMessage,
  UserMessage,
} from "./shared";

export async function sendMessage(formData: FormData, stream = false) {
  const apiKey = framework.get(Secrets.GROQ_API_KEY);
  const db = getDB();

  const [userId, parsed] = await Promise.all([
    actionRequiresUserId(),
    parseWithZod(formData, {
      schema: sendMessageSchema,
    }),
  ]);

  switch (parsed.status) {
    case "error": {
      return { lastResult: parsed.reply(), stream };
    }
    case "success": {
      const { chatId, message } = parsed.value;

      const existingDBChat = chatId
        ? await db.query.chat.findFirst({
            where: and(eq(chat.id, chatId), eq(chat.userId, userId)),
            columns: { id: true, name: true },
            with: {
              messages: {
                orderBy(fields, operators) {
                  return operators.asc(fields.id);
                },
                columns: {
                  id: true,
                  message: true,
                  userId: true,
                },
              },
            },
          })
        : undefined;

      if (chatId && !existingDBChat) {
        return {
          lastResult: parsed.reply({
            fieldErrors: {
              message: ["Chat not found."],
            },
            resetForm: false,
          }),
        };
      }

      const existingMessages = existingDBChat?.messages ?? [];

      const groq = new ChatGroq({
        apiKey,
        model: "llama3-70b-8192",
      });

      const aiMessage = createStreamableUI(<PendingAIMessage />);
      const userMessage = createStreamableUI(
        <UserMessage>{message}</UserMessage>
      );

      const chatNamePromise = !existingDBChat
        ? ChatPromptTemplate.fromMessages([
            [
              "system",
              "You are a function calling AI assistant tasked with determining a short title for a new chat thread based on the first message and calling 'set_chat_name.'.",
            ],
            [
              "human",
              "Determine a short title for a chat thread with the first message of\n" +
                "<first_message>\n{message}\n</first_message>",
            ],
          ])
            .pipe(groq)
            .invoke({ message })
            .then((response) => {
              const toolCall = response.tool_calls?.find(
                (call) => call.name === "set_chat_name"
              );
              return (toolCall?.args?.chat_name as string) || "New Chat";
            })
        : existingDBChat.name;

      const redirectToPromise = (async () => {
        try {
          const stream = await ChatPromptTemplate.fromMessages([
            ["system", "You are a helpful AI assistant."],
            ...existingMessages.map<BaseMessagePromptTemplateLike>(
              (message) => [message.userId ? "human" : "ai", message.message]
            ),
            ["human", "{message}"],
          ])
            .pipe(groq)
            .stream({
              message,
            });

          let aiResponse = "";
          let lastSentLength = 0;
          for await (const chunk of stream) {
            if (typeof chunk.content === "string" && chunk.content) {
              aiResponse += chunk.content;
              const trimmed = aiResponse.trim();
              // send in chunks of 10 characters
              if (trimmed && trimmed.length - lastSentLength >= 10) {
                lastSentLength = trimmed.length;
                aiMessage.update(<AIMessage>{trimmed}...</AIMessage>);
              }
            }
          }

          const dbChat = await db.transaction(async (tx) => {
            let dbChat: undefined | { id: string } = existingDBChat;
            if (!existingDBChat) {
              dbChat = (
                await db
                  .insert(chat)
                  .values({
                    name: await chatNamePromise,
                    userId,
                  })
                  .returning({ id: chat.id })
              )[0];
            }

            if (!dbChat) {
              tx.rollback();
              return null;
            }

            const userMessage = await tx.insert(chatMessage).values({
              chatId: dbChat.id,
              message,
              order: existingMessages.length + 1,
              userId,
            });
            if (!userMessage.changes) {
              tx.rollback();
              return null;
            }
            const aiMessage = await tx.insert(chatMessage).values({
              chatId: dbChat.id,
              message: aiResponse,
              order: existingMessages.length,
            });
            if (!aiMessage.changes) {
              tx.rollback();
              return null;
            }
            return dbChat;
          });

          if (!dbChat) {
            throw new Error("Failed to save messages.");
          }

          const redirectTo = !existingDBChat ? `/chat/${dbChat.id}` : undefined;

          userMessage.done();
          aiMessage.done(
            <>
              <AIMessage>{aiResponse.trim()}</AIMessage>
              {redirectTo ? (
                <ClientRedirect to={redirectTo} />
              ) : (
                <FocusSendMessageForm />
              )}
            </>
          );

          return redirectTo;
        } catch (reason) {
          console.error(reason);
          userMessage.done();
          aiMessage.done(
            <RetryMessage>
              Sorry, I'm having trouble processing your message. Please try
              again.
            </RetryMessage>
          );
        }
      })().catch(() => undefined);

      if (!stream && !existingDBChat) {
        const redirectTo = await redirectToPromise;
        if (redirectTo) {
          return framework.actionRedirects(redirectTo);
        }
      }

      return {
        lastResult: parsed.reply({ resetForm: true }),
        newMessages: [userMessage.value, aiMessage.value],
        stream,
      };
    }
  }
}
