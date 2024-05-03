export const Routes = {
	chatDetail: {
		pathname: (chatId: string) => `/chat/${chatId}`,
	},
	chatList: {
		pathname: () => "/chats",
	},
	login: {
		pathname: () => "/",
	},
	newChat: {
		pathname: () => "/chat",
	},
	signup: {
		pathname: () => "/signup",
	},
};

export const RevalidationTargets = {
	chatDetail: ["chat.detail"],
	chatList: ["chat", "chats"],
};
