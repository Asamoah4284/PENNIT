/**
 * Seed script: create writers (User + Author) and their stories (Work).
 * Run: npm run seed:writers   or   node scripts/seed-writers.js
 *
 * All writers use password: seedpass123
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Author from '../models/Author.js'
import Work from '../models/Work.js'

const WRITER_PASSWORD = 'seedpass123'

// Real image URLs: Pravatar (avatars), Unsplash (story thumbnails)
const writersData = [
  {
    email: 'ama.serwaa@seed.pennit.dev',
    name: 'Ama Serwaa',
    penName: 'Ama Serwaa',
    bio: 'Writer from Accra. I write about family, identity, and the coast.',
    avatarUrl: 'https://i.pravatar.cc/300?img=1',
    works: [
      {
        title: 'The Shore at Dawn',
        category: 'short_story',
        genre: 'Literary fiction',
        excerpt: 'The sea was grey that morning. She had come to the beach every day since the letter arrived.',
        body: 'The sea was grey that morning. She had come to the beach every day since the letter arrived. The fishermen had already left; their boats were dots on the horizon. She sat on the same rock, the one that had her initials from when she was twelve, and watched the waves.\n\nNothing had changed. The coast was the same. The salt in the air, the cry of gulls, the way the light broke over the water at dawn. But she had changed. The letter had changed everything.\n\nShe had read it once, then folded it and put it in her pocket. She had not read it again. She did not need to. Every word was already printed on the back of her eyes.',
        readCount: 1247,
        thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
      },
      {
        title: 'Market Day',
        category: 'short_story',
        genre: 'Contemporary',
        excerpt: 'On market day the street was a river of people. Yaa wove through it with her basket.',
        body: 'On market day the street was a river of people. Yaa wove through it with her basket. She knew every stall: the woman who sold tomatoes, the man with the dried fish, the girl who had the best kenkey.\n\nShe had come to buy, but also to listen. The market was where the news travelled. Who had married. Who had left. Who had come back.\n\nToday the news was different. A stranger had been asking after her brother. A man in a suit, from the city. Yaa felt the weight of the basket in her hand and kept walking. She would tell her mother. They would decide what to do.',
        readCount: 756,
        thumbnailUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      },
    ],
  },
  {
    email: 'kofi.mensah@seed.pennit.dev',
    name: 'Kofi Mensah',
    penName: 'Kofi Mensah',
    bio: 'Poet and storyteller. Exploring the space between tradition and now.',
    avatarUrl: 'https://i.pravatar.cc/300?img=3',
    works: [
      {
        title: 'Red Dust',
        category: 'poem',
        genre: 'Poetry',
        excerpt: 'Red dust on the road / where the lorries pass / and the children run.',
        body: 'Red dust on the road\nwhere the lorries pass\nand the children run.\n\nRed dust in the air\nin the clothes\nin the throat.\n\nRed dust on the hands\nthat plant the yam\nthat hold the child.\n\nRed dust,\nred earth,\nred heart.',
        readCount: 892,
        thumbnailUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&q=80',
      },
      {
        title: 'When the Rain Comes',
        category: 'poem',
        genre: 'Poetry',
        excerpt: 'When the rain comes / the earth remembers / every seed we buried.',
        body: 'When the rain comes\nthe earth remembers\nevery seed we buried.\n\nWhen the rain comes\nthe sky is close\nand the road is far.\n\nWhen the rain comes\nwe sit on the porch\nand say nothing.\n\nWhen the rain comes\nit is enough\nto be here.',
        readCount: 1102,
        thumbnailUrl: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=600&q=80',
      },
    ],
  },
  {
    email: 'efua.boateng@seed.pennit.dev',
    name: 'Efua Boateng',
    penName: 'Efua Boateng',
    bio: 'Novelist. Long-form fiction set in Ghana and the diaspora.',
    avatarUrl: 'https://i.pravatar.cc/300?img=5',
    works: [
      {
        title: 'The House on the Hill',
        category: 'novel',
        genre: 'Literary fiction',
        excerpt: 'The house had been empty for ten years. When Abena returned, the key still turned in the lock.',
        body: 'The house had been empty for ten years. When Abena returned, the key still turned in the lock.\n\nShe pushed the door open. Dust lay thick on the floor; the windows were grey with it. But the shape of the place was the same. The corridor that led to the courtyard. The small room where her grandmother had slept. The kitchen with its old stove.\n\nShe had left at eighteen. London, then Manchester, then London again. Jobs, a degree, a life that felt both full and empty. And now she was back. Not for a visit. For good.\n\nShe set her bag down and walked through the silence. Somewhere in the walls, she could hear the old house breathing.',
        readCount: 2103,
        thumbnailUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
      },
      {
        title: 'The Road to Tamale',
        category: 'novel',
        genre: 'Literary fiction',
        excerpt: 'He left Accra at first light. By evening he would be in Tamale, or he would not.',
        body: 'He left Accra at first light. By evening he would be in Tamale, or he would not.\n\nThe trotro was full. He had a seat by the door. The conductor hung from the step, calling out the destination. They stopped in every town. People got on and off. The sun climbed.\n\nHe had not told his mother he was leaving. He had left a note. She would find it when she came back from the market. He did not know what she would do. He did not know what he would do in Tamale. He only knew he had to go.',
        readCount: 312,
        thumbnailUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80',
      },
    ],
  },
  {
    email: 'yaw.adu@seed.pennit.dev',
    name: 'Yaw Adu',
    penName: 'Yaw Adu',
    bio: 'Short story writer. Everyday life and small moments that matter.',
    avatarUrl: 'https://i.pravatar.cc/300?img=8',
    works: [
      {
        title: 'The Last Bus to Kumasi',
        category: 'short_story',
        genre: 'Contemporary',
        excerpt: 'The bus left at dawn. By the time the sun rose, we were already on the road.',
        body: 'The bus left at dawn. By the time the sun rose, we were already on the road.\n\nI had a seat by the window. The woman next to me had a child on her lap; the child slept the whole way. Outside, the green rolled past—villages, trees, the occasional goat.\n\nI was going home. It had been three years. I did not know what I would find. I did not know if I would stay.\n\nThe bus rattled on. The woman offered me groundnut. I took a handful and said thank you. We did not speak again, but it was enough.',
        readCount: 445,
        thumbnailUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80',
      },
    ],
  },
  {
    email: 'akosua.owusu@seed.pennit.dev',
    name: 'Akosua Owusu',
    penName: 'Akosua Owusu',
    bio: 'Poet and essayist. Words for the in-between.',
    avatarUrl: 'https://i.pravatar.cc/300?img=10',
    works: [
      {
        title: 'Borders',
        category: 'poem',
        genre: 'Poetry',
        excerpt: 'We drew a line in the sand. / The sea came and took it.',
        body: 'We drew a line in the sand.\nThe sea came and took it.\n\nWe built a wall.\nThe wind blew through.\n\nWe said: here, no further.\nOur children crossed anyway.\n\nBorders are stories we tell\nwhen we are afraid of the answer.',
        readCount: 678,
        thumbnailUrl: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=600&q=80',
      },
      {
        title: 'Salt',
        category: 'poem',
        genre: 'Poetry',
        excerpt: 'Salt in the wound. Salt in the bread. Salt in the air by the sea.',
        body: 'Salt in the wound.\nSalt in the bread.\nSalt in the air by the sea.\n\nWe carry it with us.\nWe leave it behind.\nWe taste it when we weep.\n\nSalt.\nWhat remains\nwhen the water is gone.',
        readCount: 234,
        thumbnailUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80',
      },
    ],
  },
]

async function seedWriters() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pennit'
  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  let usersCreated = 0
  let authorsCreated = 0
  let worksCreated = 0

  for (const w of writersData) {
    const email = w.email.trim().toLowerCase()
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      console.log(`Skip ${email} (already exists)`)
      continue
    }

    const author = await Author.create({
      penName: w.penName || w.name,
      bio: w.bio || '',
      avatarUrl: w.avatarUrl || '',
    })
    authorsCreated++

    const user = await User.create({
      email,
      name: w.name.trim(),
      phone: '',
      password: WRITER_PASSWORD,
      role: 'writer',
      penName: (w.penName || w.name).trim(),
      authorId: author._id,
    })
    usersCreated++

    for (const work of w.works) {
      await Work.create({
        title: work.title,
        authorId: author._id,
        category: work.category,
        genre: work.genre || 'General',
        excerpt: work.excerpt || '',
        body: work.body,
        readCount: work.readCount ?? 0,
        thumbnailUrl: work.thumbnailUrl || '',
        status: 'published',
      })
      worksCreated++
    }

    console.log(`  Writer: ${w.penName} (${email}) – ${w.works.length} stories`)
  }

  console.log('')
  console.log(`Done. Created ${usersCreated} users, ${authorsCreated} authors, ${worksCreated} works.`)
  console.log(`All seed writers use password: ${WRITER_PASSWORD}`)
  await mongoose.disconnect()
  console.log('Disconnected from MongoDB')
  process.exit(0)
}

seedWriters().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
