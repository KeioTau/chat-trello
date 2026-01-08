
import { User } from './types';

export const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500'
];

export const MOCK_BOARD_MEMBERS: User[] = [
  {
    id: 'user_1',
    fullName: 'Alex River',
    username: 'alex_river',
    avatarUrl: 'https://picsum.photos/seed/alex/100',
    initials: 'AR',
    color: 'bg-blue-600'
  },
  {
    id: 'user_2',
    fullName: 'Sarah Chen',
    username: 'sarah_c',
    avatarUrl: 'https://picsum.photos/seed/sarah/100',
    initials: 'SC',
    color: 'bg-green-600'
  },
  {
    id: 'user_3',
    fullName: 'Marcus Aurelius',
    username: 'philosopher_dev',
    avatarUrl: 'https://picsum.photos/seed/marcus/100',
    initials: 'MA',
    color: 'bg-purple-600'
  },
  {
    id: 'user_4',
    fullName: 'AI Assistant',
    username: 'gemini_bot',
    avatarUrl: 'https://picsum.photos/seed/gemini/100',
    initials: 'AI',
    color: 'bg-indigo-700'
  }
];

export const CURRENT_USER: User = {
  id: 'me',
  fullName: 'You (Board Member)',
  username: 'current_user',
  avatarUrl: 'https://picsum.photos/seed/me/100',
  initials: 'ME',
  color: 'bg-gray-800'
};
