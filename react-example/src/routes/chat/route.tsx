import { getAction } from "framework";

import { sendMessage } from "./actions";
import { SendMessageForm } from "./client";

export default function ChatRoute() {
  const sendMessageAction = getAction(sendMessage);
  return (
    <div className="pt-12 pb-24">
      <div className="max-w-2xl w-full mx-auto px-4">
        <SendMessageForm
          action={sendMessage}
          initialMessages={[]}
          initialState={sendMessageAction.result}
        />
      </div>
    </div>
  );
}
