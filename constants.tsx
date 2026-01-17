
import { User } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'u_1',
    name: 'Jordan',
    age: 24,
    bio: 'Here for a good time, not a long time. 😈 No strings attached.',
    media: ['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'],
    isVideo: [false, false],
    location: '0.5 miles away',
    preference: 'Right Now',
    isVerified: true
  },
  {
    id: 'u_2',
    name: 'Sasha',
    age: 27,
    bio: 'Direct and honest. Looking for someone to explore with tonight. Discrete only.',
    media: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80'],
    isVideo: [false, false],
    location: '1.2 miles away',
    preference: 'Discrete',
    isVerified: true
  },
  {
    id: 'u_3',
    name: 'Riley',
    age: 22,
    bio: 'Just moved here. Wanting a tour guide and maybe more. Keep it spicy. ✨',
    media: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80'],
    isVideo: [false],
    location: '3 miles away',
    preference: 'Tonight',
    isVerified: false
  },
  {
    id: 'u_4',
    name: 'Alex',
    age: 25,
    bio: 'Work hard, play harder. FWB preferred. No drama.',
    media: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80'],
    isVideo: [false],
    location: 'Nearby',
    preference: 'FWB',
    isVerified: true
  },
  {
    id: 'u_5',
    name: 'Casey',
    age: 23,
    bio: 'Late night drives and late night vibes. Let\'s see where it goes.',
    media: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80'],
    isVideo: [false],
    location: '2 miles away',
    preference: 'Tonight',
    isVerified: false
  }
];
