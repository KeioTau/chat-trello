
export interface User {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string;
  initials: string;
  color: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  memberIds: string[];
  messages: Message[];
  isGroup: boolean;
  lastActivity: number;
}

export interface TrelloContext {
  board: {
    id: string;
    name: string;
  };
  member: User;
}
