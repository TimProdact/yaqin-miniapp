export const PHOTOS = {
  malika: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=85',
  mila: 'https://images.pexels.com/photos/4531546/pexels-photo-4531546.jpeg?auto=compress&cs=tinysrgb&w=800&q=80',
  anya: 'https://images.pexels.com/photos/9148018/pexels-photo-9148018.jpeg?auto=compress&cs=tinysrgb&w=800&q=80',
  city: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=85',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85',
  books: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=85',
  palms: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85',
  event: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=85'
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
  {
    id: 0,
    title: 'Девушки Ташкента',
    subtitle: 'Кофе, прогулки и новые знакомства',
    about: 'Место, чтобы знакомиться, находить новые места и проводить время вместе.',
    city: 'Ташкент',
    members: 1240,
    active: 'Сейчас онлайн',
    photo: PHOTOS.palms,
    joined: true,
    online: 11,
    joinQuestion: 'Что вам больше всего нравится в Ташкенте?',
    arrivals: [
      { name: 'Аня', photo: people[2].photo, time: '56 мин', answer: 'Кофейни и прогулки по Мирабаду' },
      { name: 'Мила', photo: people[1].photo, time: '1 ч', answer: 'Йога в парке и субботние рынки' },
      { name: 'Малика', photo: people[0].photo, time: '2 ч', answer: 'Книжные и вечерние набережные' }
    ]
  },
  {
    id: 1,
    title: 'Юнусабад: спорт и йога',
    subtitle: 'Встречи каждые выходные',
    about: 'Утренние пробежки, йога в парке и совместные завтраки.',
    city: 'Ташкент, Юнусабад',
    members: 386,
    active: 'Была активна 21 мин назад',
    photo: people[1].photo,
    joined: true
  },
  {
    id: 2,
    title: 'Книжный клуб',
    subtitle: 'Читаем и обсуждаем по субботам',
    about: 'Читаем одну книгу в месяц и собираемся обсудить в кафе.',
    city: 'Ташкент',
    members: 214,
    active: 'Была активна 8 ч назад',
    photo: PHOTOS.books,
    joined: false
  }
];

export const events = [
  {
    id: 0,
    title: 'Кофе-прогулка по Мирабаду',
    when: 'Вс, 14 сен · 11:00–13:00',
    day: '14',
    month: 'сен',
    place: 'Кофейня Moon',
    address: 'ул. Тараса Шевченко, 12',
    group: 'Девушки Ташкента',
    host: 'Камила',
    going: 12,
    photo: PHOTOS.coffee
  },
  {
    id: 1,
    title: 'Вечер кино',
    when: 'Пт, 19 сен · 19:30–22:00',
    day: '19',
    month: 'сен',
    place: 'Кинотеатр Next',
    address: 'ТРЦ Compass, Юнусабад',
    group: 'Юнусабад: спорт и йога',
    host: 'Мила',
    going: 8,
    photo: PHOTOS.event
  },
  {
    id: 2,
    title: 'Пробежка и завтрак',
    when: 'Сб, 20 сен · 10:00–12:00',
    day: '20',
    month: 'сен',
    place: 'Парк Ашхабад',
    address: 'Юнусабад, 12-й квартал',
    group: 'Юнусабад: спорт и йога',
    host: 'Мила',
    going: 16,
    photo: PHOTOS.city
  }
];

export const chats = [
  {
    personId: 1,
    name: 'Малика',
    preview: 'Тоже люблю этот район!',
    photo: people[0].photo,
    unread: true,
    time: '1 д',
    messages: [
      {
        from: 'them',
        name: 'Малика',
        text: 'Привет! Какие фильмы любишь?\nМило, у нас похожие вкусы!',
        time: '1 д',
        reaction: '❤️'
      },
      {
        from: 'them',
        name: 'Малика',
        text: 'пригласила вас в группу',
        time: '5 мин',
        link: {
          url: 'https://t.me/yaqin_bot?start=g_books',
          domain: 'yaqin.uz',
          title: 'Книжный клуб в Yaqin',
          desc: 'Ташкент — читаем и обсуждаем по субботам 📚',
          image: PHOTOS.books
        }
      },
      {
        from: 'them',
        name: 'Малика',
        text: 'привет! 🤣\nсейчас на пляже hehe',
        time: 'только что',
        replyTo: 'Мило, у нас похожие вкусы!',
        image: PHOTOS.palms
      },
      {
        from: 'them',
        name: 'Малика',
        time: 'только что',
        audio: { duration: '0:10' }
      }
    ]
  },
  {
    personId: 3,
    name: 'Аня',
    preview: 'Договорились, в субботу',
    photo: people[2].photo,
    unread: true,
    time: '1 д',
    messages: [
      { from: 'them', name: 'Аня', text: 'Давай в субботу на керамику?', time: '2 д' },
      { from: 'them', name: 'Аня', text: 'Договорились, в субботу', time: '1 д', image: PHOTOS.coffee }
    ]
  },
  {
    personId: 2,
    name: 'Мила',
    preview: '',
    photo: people[1].photo,
    unread: false,
    time: '',
    messages: []
  },
  {
    personId: null,
    name: 'Команда Yaqin',
    preview: 'Добро пожаловать в Yaqin ✨',
    photo: null,
    unread: false,
    time: '2 д',
    team: true,
    messages: [
      { from: 'them', name: 'Команда Yaqin', text: 'Добро пожаловать в Yaqin ✨', time: '2 д' }
    ]
  }
];

export const activity = [
  {
    id: 'evt-1',
    kind: 'event',
    title: 'В «Девушки Ташкента»',
    text: 'Новое событие: «Клубный вечер у Moon»',
    time: '8 ч',
    unread: true,
    photo: people[0].photo,
    action: 'event',
    actionId: 0,
    month: 'Сен'
  },
  {
    id: 'evt-2',
    kind: 'event',
    title: 'В «Девушки Ташкента»',
    text: 'Новое событие: «Кофе-прогулка по Мирабаду»',
    time: '8 ч',
    unread: true,
    photo: people[0].photo,
    action: 'event',
    actionId: 0
  },
  {
    id: 'friend-1',
    kind: 'friend',
    title: 'Мила',
    text: 'отправила заявку в подруги',
    time: '11 ч',
    unread: true,
    photo: people[1].photo,
    action: 'friends'
  },
  {
    id: 'verify',
    kind: 'verify',
    title: 'Фото в анкете подтверждено!',
    text: 'Можно знакомиться с новыми людьми.',
    time: '3 д',
    unread: false,
    photo: people[0].photo,
    verified: true
  },
  {
    id: 'like-1',
    kind: 'like',
    title: 'Мила отправила симпатию',
    text: 'Ответьте приветом, если хотите познакомиться.',
    time: '1 ч',
    unread: false,
    photo: people[1].photo,
    action: 'person',
    actionId: 1
  },
  {
    id: 'match-1',
    kind: 'match',
    title: 'У вас новый мэтч с Милой',
    text: 'Напишите первой — переписка уже открыта.',
    time: '1 ч',
    unread: false,
    photo: people[1].photo,
    action: 'chat',
    actionId: 0
  }
];

export const defaultProfile = {
  name: 'Камила',
  age: 25,
  city: 'Ташкент, Мирабад',
  bio: 'Ищу подруг для прогулок и кофе в городе 💕',
  tags: ['фото', 'книги', 'кофе', 'бег', 'йога', 'еда'],
  looking: ['кофе', 'прогулки', 'книжный клуб'],
  photo: people[0].photo,
  photos: [people[0].photo, PHOTOS.city, PHOTOS.coffee, PHOTOS.books]
};

export const promptPhoto = PHOTOS.city;
