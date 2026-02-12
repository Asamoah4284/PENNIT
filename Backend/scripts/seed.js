import 'dotenv/config'
import mongoose from 'mongoose'
import Author from '../models/Author.js'
import Work from '../models/Work.js'

const authorsData = [
  {
    penName: 'Ama Serwaa',
    bio: 'Writer from Accra. I write about family, identity, and the coast.',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
  },
  {
    penName: 'Kofi Mensah',
    bio: 'Poet and storyteller. Exploring the space between tradition and now.',
    avatarUrl: 'https://i.pravatar.cc/150?img=3',
  },
  {
    penName: 'Efua Boateng',
    bio: 'Novelist. Long-form fiction set in Ghana and the diaspora.',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
  },
]

const worksData = [
  {
    title: 'The Shore at Dawn',
    category: 'short_story',
    genre: 'Literary fiction',
    excerpt:
      'The sea was grey that morning. She had come to the beach every day since the letter arrived.',
    body: 'The sea was grey that morning. She had come to the beach every day since the letter arrived. The fishermen had already left; their boats were dots on the horizon. She sat on the same rock, the one that had her initials from when she was twelve, and watched the waves.\n\nNothing had changed. The coast was the same. The salt in the air, the cry of gulls, the way the light broke over the water at dawn. But she had changed. The letter had changed everything.\n\nShe had read it once, then folded it and put it in her pocket. She had not read it again. She did not need to. Every word was already printed on the back of her eyes.',
    readCount: 1247,
    thumbnailUrl: 'https://picsum.photos/seed/shore/400/400',
    authorIndex: 0,
  },
  {
    title: 'Red Dust',
    category: 'poem',
    genre: 'Poetry',
    excerpt: 'Red dust on the road / where the lorries pass / and the children run.',
    body: 'Red dust on the road\nwhere the lorries pass\nand the children run.\n\nRed dust in the air\nin the clothes\nin the throat.\n\nRed dust on the hands\nthat plant the yam\nthat hold the child.\n\nRed dust,\nred earth,\nred heart.',
    readCount: 892,
    thumbnailUrl: 'https://picsum.photos/seed/dust/400/400',
    authorIndex: 1,
  },
  {
    title: 'The House on the Hill',
    category: 'novel',
    genre: 'Literary fiction',
    excerpt:
      'The house had been empty for ten years. When Abena returned, the key still turned in the lock.',
    body: 'The house had been empty for ten years. When Abena returned, the key still turned in the lock.\n\nShe pushed the door open. Dust lay thick on the floor; the windows were grey with it. But the shape of the place was the same. The corridor that led to the courtyard. The small room where her grandmother had slept. The kitchen with its old stove.\n\nShe had left at eighteen. London, then Manchester, then London again. Jobs, a degree, a life that felt both full and empty. And now she was back. Not for a visit. For good.\n\nShe set her bag down and walked through the silence. Somewhere in the walls, she could hear the old house breathing.',
    readCount: 2103,
    thumbnailUrl: 'https://picsum.photos/seed/house/400/400',
    authorIndex: 2,
  },
  {
    title: 'Market Day',
    category: 'short_story',
    genre: 'Contemporary',
    excerpt:
      'On market day the street was a river of people. Yaa wove through it with her basket.',
    body: 'On market day the street was a river of people. Yaa wove through it with her basket. She knew every stall: the woman who sold tomatoes, the man with the dried fish, the girl who had the best kenkey.\n\nShe had come to buy, but also to listen. The market was where the news travelled. Who had married. Who had left. Who had come back.\n\nToday the news was different. A stranger had been asking after her brother. A man in a suit, from the city. Yaa felt the weight of the basket in her hand and kept walking. She would tell her mother. They would decide what to do.',
    readCount: 756,
    thumbnailUrl: 'https://picsum.photos/seed/market/400/400',
    authorIndex: 0,
  },
  {
    title: 'When the Rain Comes',
    category: 'poem',
    genre: 'Poetry',
    excerpt: 'When the rain comes / the earth remembers / every seed we buried.',
    body: 'When the rain comes\nthe earth remembers\nevery seed we buried.\n\nWhen the rain comes\nthe sky is close\nand the road is far.\n\nWhen the rain comes\nwe sit on the porch\nand say nothing.\n\nWhen the rain comes\nit is enough\nto be here.',
    readCount: 1102,
    thumbnailUrl: 'https://picsum.photos/seed/rain/400/400',
    authorIndex: 1,
  },
]

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pennit'
  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  await Work.deleteMany({})
  await Author.deleteMany({})

  const authors = await Author.insertMany(authorsData)
  console.log(`Created ${authors.length} authors`)

  const worksToInsert = worksData.map((w) => {
    const { authorIndex, ...rest } = w
    return { ...rest, authorId: authors[authorIndex]._id }
  })
  await Work.insertMany(worksToInsert)
  console.log(`Created ${worksToInsert.length} works`)

  await mongoose.disconnect()
  console.log('Seed complete')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
