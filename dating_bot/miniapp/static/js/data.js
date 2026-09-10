export const PHOTOS = {
  malika: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=85',
  mila: 'https://images.pexels.com/photos/4531546/pexels-photo-4531546.jpeg?auto=compress&cs=tinysrgb&w=800&q=80',
  anya: 'https://images.pexels.com/photos/9148018/pexels-photo-9148018.jpeg?auto=compress&cs=tinysrgb&w=800&q=80',
  sara: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1000&q=85',
  dilnoza: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=85',
  zarina: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85',
  nilufar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85',
  kamila: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=1000&q=85',
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
    distanceKm: 4,
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
    distanceKm: 12,
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
    distanceKm: 48,
    basic: [
      { label: 'Работа', value: 'Керамистка' },
      { label: 'Языки', value: 'русский, английский' }
    ]
  },
  {
    id: 4,
    name: 'Сара',
    age: 25,
    city: 'Ташкент, Чиланзар',
    bio: 'Фотопрогулки и винтажные барахолки по выходным.',
    tags: ['фото', 'винтаж', 'кофе', 'дизайн'],
    looking: ['совместные съёмки', 'кофе'],
    photo: PHOTOS.sara,
    photos: [PHOTOS.sara, PHOTOS.city],
    distanceKm: 9,
    basic: [
      { label: 'Работа', value: 'Фотограф' },
      { label: 'Языки', value: 'русский, английский' }
    ]
  },
  {
    id: 5,
    name: 'Дилноза',
    age: 28,
    city: 'Ташкент, Сергели',
    bio: 'Готовлю плов для подруг и ищу компанию на концерты.',
    tags: ['еда', 'музыка', 'концерты', 'кухня'],
    looking: ['ужины', 'живые концерты'],
    photo: PHOTOS.dilnoza,
    photos: [PHOTOS.dilnoza, PHOTOS.event],
    distanceKm: 18,
    basic: [
      { label: 'Работа', value: 'Маркетолог' },
      { label: 'Языки', value: 'узбекский, русский' }
    ]
  },
  {
    id: 6,
    name: 'Зарина',
    age: 23,
    city: 'Ташкент, Яккасарай',
    bio: 'Учу итальянский и обожаю долгие разговоры за эспрессо.',
    tags: ['языки', 'кофе', 'кино', 'путешествия'],
    looking: ['языковой обмен', 'кино'],
    photo: PHOTOS.zarina,
    photos: [PHOTOS.zarina, PHOTOS.coffee],
    distanceKm: 6,
    basic: [
      { label: 'Учёба', value: 'УзГУМЯ' },
      { label: 'Языки', value: 'русский, итальянский' }
    ]
  },
  {
    id: 7,
    name: 'Нилуфар',
    age: 29,
    city: 'Ташкент, Мирабад',
    bio: 'Бегаю по набережной и собираю мини-группы на parkrun.',
    tags: ['бег', 'спорт', 'утро', 'здоровье'],
    looking: ['утренние пробежки'],
    photo: PHOTOS.nilufar,
    photos: [PHOTOS.nilufar, PHOTOS.city],
    distanceKm: 3,
    basic: [
      { label: 'Работа', value: 'Продакт' },
      { label: 'Языки', value: 'узбекский, русский, английский' }
    ]
  },
  {
    id: 8,
    name: 'Камила',
    age: 26,
    city: 'Ташкент, Юнусабад',
    bio: 'Ищу подруг для выставок и тихих воскресных бранчей.',
    tags: ['арт', 'бранч', 'дизайн', 'прогулки'],
    looking: ['музеи', 'бранчи'],
    photo: PHOTOS.kamila,
    photos: [PHOTOS.kamila, PHOTOS.books],
    distanceKm: 11,
    basic: [
      { label: 'Работа', value: 'Арт-директор' },
      { label: 'Языки', value: 'русский, английский' }
    ]
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
    photo: PHOTOS.coffee,
    ticketMode: 'paid',
    price: 45000,
    fee: 5000,
    currency: 'UZS'
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
    photo: PHOTOS.event,
    ticketMode: 'paid',
    price: 85000,
    fee: 8000,
    currency: 'UZS'
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
    photo: PHOTOS.city,
    ticketMode: 'door',
    price: 30000,
    fee: 5000,
    currency: 'UZS'
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
