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

/** Анкеты в модели Taneesh B2C (`UpdateUserProfile`). */
export const people = [
  {
    id: 1,
    name: 'Малика',
    age: 26,
    city: 'Ташкент',
    bio: 'Ищу компанию для прогулок по городу и вечернего кофе 💕',
    purposeType: 4,
    interests: ['фотография', 'книги', 'кофе', 'бег', 'йога', 'еда', 'прогулки', 'спорт', 'путешествия'],
    height: 168,
    worldView: 10,
    zodiacSign: 7,
    education: 2,
    hasChildren: 1,
    alcoholAttitude: 2,
    smokingAttitude: 1,
    languages: ['узбекский', 'русский'],
    photo: PHOTOS.malika,
    photos: [PHOTOS.malika, PHOTOS.city, PHOTOS.coffee],
    distanceKm: 4
  },
  {
    id: 2,
    name: 'Мила',
    age: 27,
    city: 'Ташкент',
    bio: 'Йога, матча и новые места в городе.',
    purposeType: 3,
    interests: ['йога', 'кофе', 'кино', 'фитнес'],
    height: 165,
    worldView: 9,
    zodiacSign: 5,
    education: 2,
    hasChildren: 1,
    alcoholAttitude: 2,
    smokingAttitude: 1,
    languages: ['узбекский', 'английский'],
    photo: PHOTOS.mila,
    photos: [PHOTOS.mila, PHOTOS.coffee],
    distanceKm: 12
  },
  {
    id: 3,
    name: 'Аня',
    age: 24,
    city: 'Самарканд',
    bio: 'Люблю вино, керамику и спокойные разговоры.',
    purposeType: 5,
    interests: ['искусство', 'музыка', 'кофе', 'прогулки'],
    height: 170,
    worldView: 10,
    zodiacSign: 11,
    education: 2,
    hasChildren: 1,
    alcoholAttitude: 3,
    smokingAttitude: 1,
    languages: ['русский', 'английский'],
    photo: PHOTOS.anya,
    photos: [PHOTOS.anya, PHOTOS.books],
    distanceKm: 48
  },
  {
    id: 4,
    name: 'Сара',
    age: 25,
    city: 'Ташкент',
    bio: 'Фотопрогулки и винтажные барахолки по выходным.',
    purposeType: 3,
    interests: ['фотография', 'дизайн', 'кофе', 'искусство'],
    height: 172,
    worldView: 9,
    zodiacSign: 3,
    education: 2,
    hasChildren: 1,
    alcoholAttitude: 2,
    smokingAttitude: 1,
    languages: ['русский', 'английский'],
    photo: PHOTOS.sara,
    photos: [PHOTOS.sara, PHOTOS.city],
    distanceKm: 9
  },
  {
    id: 5,
    name: 'Дилноза',
    age: 28,
    city: 'Ташкент',
    bio: 'Готовлю плов для подруг и ищу компанию на концерты.',
    purposeType: 4,
    interests: ['еда', 'музыка', 'кино', 'путешествия'],
    height: 164,
    worldView: 4,
    zodiacSign: 6,
    education: 2,
    hasChildren: 2,
    alcoholAttitude: 2,
    smokingAttitude: 1,
    languages: ['узбекский', 'русский'],
    photo: PHOTOS.dilnoza,
    photos: [PHOTOS.dilnoza, PHOTOS.event],
    distanceKm: 18
  },
  {
    id: 6,
    name: 'Зарина',
    age: 23,
    city: 'Ташкент',
    bio: 'Учу языки и обожаю долгие разговоры за эспрессо.',
    purposeType: 5,
    interests: ['книги', 'кофе', 'кино', 'путешествия'],
    height: 166,
    worldView: 10,
    zodiacSign: 2,
    education: 2,
    hasChildren: 1,
    alcoholAttitude: 2,
    smokingAttitude: 1,
    languages: ['русский', 'английский', 'турецкий'],
    photo: PHOTOS.zarina,
    photos: [PHOTOS.zarina, PHOTOS.coffee],
    distanceKm: 6
  },
  {
    id: 7,
    name: 'Нилуфар',
    age: 29,
    city: 'Ташкент',
    bio: 'Бегаю по набережной и собираю мини-группы на parkrun.',
    purposeType: 4,
    interests: ['бег', 'спорт', 'фитнес', 'йога'],
    height: 169,
    worldView: 10,
    zodiacSign: 9,
    education: 2,
    hasChildren: 1,
    alcoholAttitude: 1,
    smokingAttitude: 1,
    languages: ['узбекский', 'русский', 'английский'],
    photo: PHOTOS.nilufar,
    photos: [PHOTOS.nilufar, PHOTOS.city],
    distanceKm: 3
  },
  {
    id: 8,
    name: 'Камила',
    age: 26,
    city: 'Ташкент',
    bio: 'Ищу подруг для выставок и тихих воскресных бранчей.',
    purposeType: 3,
    interests: ['искусство', 'дизайн', 'прогулки', 'еда'],
    height: 167,
    worldView: 9,
    zodiacSign: 12,
    education: 2,
    hasChildren: 1,
    alcoholAttitude: 3,
    smokingAttitude: 1,
    languages: ['русский', 'английский'],
    photo: PHOTOS.kamila,
    photos: [PHOTOS.kamila, PHOTOS.books],
    distanceKm: 11
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
  city: 'Ташкент',
  bio: 'Ищу подруг для прогулок и кофе в городе 💕',
  purposeType: 3,
  interests: ['фотография', 'книги', 'кофе', 'бег', 'йога', 'еда'],
  height: 167,
  worldView: 9,
  zodiacSign: 7,
  education: 2,
  hasChildren: 1,
  alcoholAttitude: 2,
  smokingAttitude: 1,
  languages: ['русский', 'узбекский'],
  photo: people[0].photo,
  photos: [people[0].photo, PHOTOS.city, PHOTOS.coffee, PHOTOS.books]
};

export const promptPhoto = PHOTOS.city;
