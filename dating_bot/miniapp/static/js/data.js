const PHOTOS = {
  malika: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=85',
  mila: 'https://images.pexels.com/photos/4531546/pexels-photo-4531546.jpeg?auto=compress&cs=tinysrgb&w=800&q=80',
  anya: 'https://images.pexels.com/photos/9148018/pexels-photo-9148018.jpeg?auto=compress&cs=tinysrgb&w=800&q=80',
  city: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=85',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85',
  books: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=85'
};

export const people = [
  {
    id: 1,
    name: 'Малика',
    age: 26,
    city: 'Ташкент, Мирабад',
    bio: 'Ищу компанию для прогулок по городу и вечернего кофе 💕',
    tags: ['фото', 'книги', 'кофе', 'бег', 'йога', 'еда', 'рынок', 'прогулки', 'спорт', 'путешествия'],
    looking: ['кофе', 'прогулки', 'книжный клуб', 'бег', 'кафе'],
    photo: PHOTOS.malika,
    photos: [PHOTOS.malika, PHOTOS.city, PHOTOS.coffee],
    groups: [
      { title: 'Девушки Ташкента', photo: PHOTOS.mila },
      { title: 'Книжный клуб', photo: PHOTOS.books },
      { title: 'Утренние пробежки', photo: PHOTOS.city }
    ],
    basic: [
      { label: 'Работа', value: 'Дизайнер' },
      { label: 'Языки', value: 'узбекский, русский' },
      { label: 'Учёба', value: 'ТУИТ' }
    ]
  },
  {
    id: 2,
    name: 'Мила',
    age: 27,
    city: 'Ташкент, Юнусабад',
    bio: 'Йога, матча и новые места в городе.',
    tags: ['йога', 'матча', 'кино'],
    looking: ['йога вдвоём', 'завтраки'],
    photo: PHOTOS.mila,
    photos: [PHOTOS.mila, PHOTOS.coffee],
    groups: [{ title: 'Юнусабад: спорт и йога', photo: PHOTOS.anya }],
    basic: [
      { label: 'Работа', value: 'Тренер по йоге' },
      { label: 'Языки', value: 'узбекский, английский' }
    ]
  },
  {
    id: 3,
    name: 'Аня',
    age: 24,
    city: 'Самарканд',
    bio: 'Люблю вино, керамику и спокойные разговоры.',
    tags: ['керамика', 'вино', 'музыка'],
    looking: ['мастер-классы', 'вечерние прогулки'],
    photo: PHOTOS.anya,
    photos: [PHOTOS.anya, PHOTOS.books],
    groups: [{ title: 'Керамика по выходным', photo: PHOTOS.books }],
    basic: [
      { label: 'Работа', value: 'Керамистка' },
      { label: 'Языки', value: 'русский, английский' }
    ]
  }
];

export const groups = [
  { title: 'Девушки Ташкента', subtitle: 'Кофе, прогулки и новые знакомства', photo: people[1].photo },
  { title: 'Юнусабад: спорт и йога', subtitle: 'Встречи каждые выходные', photo: people[2].photo },
  { title: 'Книжный клуб', subtitle: 'Читаем и обсуждаем по субботам', photo: people[0].photo }
];

export const events = [
  { title: 'Кофе-прогулка', when: 'Воскресенье · 11:00', friends: '12 участниц' },
  { title: 'Вечер кино', when: 'Пятница · 19:30', friends: '8 участниц' },
  { title: 'Пробежка и завтрак', when: 'Суббота · 10:00', friends: '16 участниц' }
];

export const chats = [
  { name: 'Малика', preview: 'Тоже люблю этот район!', photo: people[1].photo },
  { name: 'Аня', preview: 'Договорились, в субботу', photo: people[2].photo },
  { name: 'Команда Yaqin', preview: 'Добро пожаловать в Yaqin ✨', photo: null }
];

export const defaultProfile = {
  name: 'Камила',
  age: 25,
  city: 'Ташкент, Мирабад',
  bio: 'Ищу подруг для прогулок и кофе в городе 💕',
  tags: ['фото', 'книги', 'кофе', 'бег', 'йога', 'еда'],
  looking: ['кофе', 'прогулки', 'книжный клуб'],
  photo: people[0].photo
};

export const promptPhoto = 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=85';
