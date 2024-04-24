import { getAction } from "framework";

import { sendMessage } from "./actions";
import { SendMessageForm } from "./client";
import { AIMessage, UserMessage } from "./shared";

export default function ChatRoute() {
  const sendMessageAction = getAction(sendMessage);
  return (
    <div className="pt-12 pb-24">
      <div className="max-w-2xl w-full mx-auto px-4">
        <SendMessageForm
          action={sendMessage}
          initialState={sendMessageAction.result}
        >
          <UserMessage>Initial message</UserMessage>
          <AIMessage>Initial response</AIMessage>
        </SendMessageForm>
      </div>
    </div>
  );
}
