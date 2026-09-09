export const people = [
  {
    id: 1,
    name: 'Christine M.',
    age: 32,
    city: 'Granada Hills North, Granada Hills',
    bio: 'Looking for friends to hang out with in the city 💕',
    tags: ['Photography', 'Writing', 'Coffee', 'Running'],
    photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=85'
  },
  {
    id: 2,
    name: 'Мила',
    age: 27,
    city: 'Ташкент',
    bio: 'Йога, матча и новые места в городе.',
    tags: ['йога', 'матча'],
    photo: 'https://images.pexels.com/photos/4531546/pexels-photo-4531546.jpeg?auto=compress&cs=tinysrgb&w=800&q=80'
  },
  {
    id: 3,
    name: 'Аня',
    age: 24,
    city: 'Самарканд',
    bio: 'Люблю вино, керамику и спокойные разговоры.',
    tags: ['вино', 'керамика'],
    photo: 'https://images.pexels.com/photos/9148018/pexels-photo-9148018.jpeg?auto=compress&cs=tinysrgb&w=800&q=80'
  }
];

export const groups = [
  { title: 'Social Girls In LA', subtitle: 'Coffee, walks and new friends', photo: people[1].photo },
  { title: 'San Fernando Valley Girl Club!', subtitle: 'Events every weekend', photo: people[2].photo },
  { title: 'Coffee & Running', subtitle: 'Meet people nearby', photo: people[0].photo }
];

export const events = [
  { title: 'Sunday Coffee Walk', when: 'Sunday · 11:00', friends: '12 friends' },
  { title: 'Movie night', when: 'Friday · 19:30', friends: '8 friends' },
  { title: 'Run & brunch', when: 'Saturday · 10:00', friends: '16 friends' }
];

export const chats = [
  { name: 'Alex', preview: 'Cute, we have the same name!', photo: people[1].photo },
  { name: 'Julie', preview: 'Hi', photo: people[2].photo },
  { name: 'BFF Team', preview: 'Hi Alex! Welcome to BFF ✨', photo: null }
];

export const defaultProfile = {
  name: 'Christine M.',
  age: 32,
  city: 'Granada Hills North, Granada Hills',
  bio: 'Looking for friends to hang out with in the city 💕',
  tags: ['Photography', 'Writing', 'Coffee', 'Running', 'Yoga', 'Foodie'],
  looking: ['Coffee', 'walking', 'book club'],
  photo: people[0].photo
};

export const promptPhoto = 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=85';
