const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Load models
const User = require('./src/models/User.model');
const Post = require('./src/models/Post.model');

// A curated list of highly aesthetic, trending Unsplash photo IDs (Fashion, Tech, Lifestyle, Architecture, Nature)
const AESTHETIC_UNSPLASH_IDS = [
    '1515886657613-9f3515b0c78f', // Fashion woman
    '1494790108377-be9c29b29330', // Stylish man
    '1483985988355-763728e1935b', // Fashion runway
    '1529139574466-a3028ed43186', // Aesthetic workspace
    '1505740420928-5e560c06d30e', // Minimalist product
    '1498050108023-c5249f4df085', // Web developer code
    '1522202176988-66273c2fd55f', // Coffee aesthetic
    '1469334025819-66d11f7c2317', // Minimalist interior
    '1517841905240-472988babdf9', // Female model portrait
    '1534528741775-53994a69daeb', // Stylish glasses portrait
    '1512413914486-1eb8a5d33dd5', // Hipster aesthetic
    '1503342394128-c104d54dba01', // Streetwear style
    '1512314889357-e157c22f938d', // Workspace tech
    '1496171365181-e2f099719391', // Laptop code aesthetic
    '1521737604893-d14cc237f11d', // Architecture minimal
    '1449034446443-43184fbfa199', // Classic car aesthetic
    '1501196354995-c91a40954b0c', // Minimalist lamp
    '1513694203232-719ea280c98d', // Sneakers hype
    '1523398002811-999aa8e9570e', // Camera vintage
    '1470082719408-b2843ab5c9ab', // Drone nature aesthetic
    '1502759683299-cdcd69742449', // Indian wedding/fashion
    '1542385151-efd9000785a0',    // Indian culture street
    '1564882193582-7f722a4fc0fc', // Yoga minimalist
    '1518291344630-4857135fb581', // Taj mahal aesthetic
    '1515159392-4933909776d4',    // Travel luxury
    '1507525428034-b723cf961d3e', // Surfing aesthetic
    '1490481651828-3f59e843fa62', // Neon city
    '1550684848-fac1c5b4e853',    // Hacker/cyber aesthetic
    '1519389953810-195a9462828b', // Modern desk setup
    '1504593811410-fb1e6d4c3826', // High fashion editorial
    '1531746020798-e6953c6e8e04', // Portrait indian woman
];

const GENERATE_IMAGE_URL = (id) => `https://images.unsplash.com/photo-${id}?q=80&w=1200&auto=format&fit=crop`;

const POST_TITLES_AND_CONTENTS = [
    { title: "Embracing the minimal", content: "Sometimes less is truly more. Finding peace in empty spaces and clean lines. #minimal #aesthetic #lifestyle" },
    { title: "Late night coding sessions", content: "Fuelled by caffeine and passion. Building the future one line of code at a time. What are you working on right now? 💻✨ #developer #tech #coding" },
    { title: "Streetwear vibes today", content: "Putting together the perfect fit. Confidence is the best accessory you can wear. 🖤🔥 #fashion #streetwear #style" },
    { title: "Golden hour magic", content: "Chasing the sun before it sets. The light was absolutely perfect today. Nature never disappoints. 🌅 #goldenhour #photography #nature" },
    { title: "Workspace upgrade", content: "Finally got my desk setup looking the way I want it. Productivity is heavily influenced by your environment! 🚀 #setup #workspace #tech" },
    { title: "Finding inspiration everywhere", content: "Took a walk around the city and noticed so many beautiful architectural details I usually miss. Slow down and look around! 🏙️ #architecture #citylife #inspiration" },
    { title: "Weekend getaway", content: "Disconnecting to reconnect. Sometimes you just need to pack a bag and leave the city behind. ✈️🌴 #travel #wanderlust #escape" },
    { title: "Design is thinking made visual", content: "Working on some new UI concepts today. Obsessing over typography and negative space. 🎨 #design #uiux #creativity" },
    { title: "Coffee first, always.", content: "Starting the day with the perfect pour-over. Who else is completely non-functional before their first cup? ☕ #coffee #morningroutine #lifestyle" },
    { title: "Chasing dreams", content: "It's a slow process, but quitting won't speed it up. Stay focused on your vision. 💯 #motivation #hustle #mindset" }
];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateUsers = async () => {
    console.log('Fetching 50 realistic Indian profiles from RandomUser API...');
    const response = await fetch('https://randomuser.me/api/?results=50&nat=in');
    const data = await response.json();
    
    // Default shared password for testing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123!', salt);

    const usersToInsert = data.results.map((u, i) => {
        return {
            username: `${u.login.username}_${Math.floor(Math.random() * 1000)}`,
            email: `seeded_${i}_${u.email}`,
            password: hashedPassword,
            profilePic: u.picture.large,
            bio: `Hi, I'm ${u.name.first}. Passionate about design, tech, and lifestyle. Living the best life in ${u.location.city}. ✨`,
            pronouns: i % 2 === 0 ? 'He/Him' : 'She/Her',
            coverImage: GENERATE_IMAGE_URL(randomItem(AESTHETIC_UNSPLASH_IDS)),
            followerCount: 0,
            followingCount: 0,
            coins: Math.floor(Math.random() * 500)
        };
    });

    return usersToInsert;
};

const generatePosts = (users) => {
    console.log(`Generating posts for ${users.length} users...`);
    const postsToInsert = [];
    
    users.forEach(user => {
        // 2 to 4 posts per user
        const numPosts = Math.floor(Math.random() * 3) + 2; 
        
        for (let i = 0; i < numPosts; i++) {
            const template = randomItem(POST_TITLES_AND_CONTENTS);
            postsToInsert.push({
                title: template.title,
                content: template.content,
                image: GENERATE_IMAGE_URL(randomItem(AESTHETIC_UNSPLASH_IDS)),
                hashtags: template.content.match(/#[a-zA-Z0-9_]+/g)?.map(t => t.replace('#', '')) || [],
                author: user._id,
                likeCount: 0,
                isArchived: false,
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)) // Random time in the last ~100 days
            });
        }
    });

    return postsToInsert;
};

const runSeed = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env');
        }

        console.log('Connecting to production MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB.');

        // Generate and insert users
        const usersData = await generateUsers();
        console.log(`Inserting ${usersData.length} users...`);
        // We use insertMany directly since password is pre-hashed above
        const insertedUsers = await User.insertMany(usersData);
        console.log('✅ Users inserted successfully.');

        // Generate and insert posts
        const postsData = generatePosts(insertedUsers);
        console.log(`Inserting ${postsData.length} aesthetic posts...`);
        const insertedPosts = await Post.insertMany(postsData);
        console.log('✅ Posts inserted successfully.');

        console.log('Simulating likes and followers to make network active...');
        // Simulate some social activity
        for (let post of insertedPosts) {
            // Random 5 to 20 likes
            post.likeCount = Math.floor(Math.random() * 16) + 5;
            // Note: If you have a separate Like model, we won't seed individual like docs to save script time, 
            // but the likeCount will make the UI look active and highly engaging immediately.
            await Post.updateOne({ _id: post._id }, { $set: { likeCount: post.likeCount } });
        }

        for (let user of insertedUsers) {
            const followers = Math.floor(Math.random() * 30) + 5;
            const following = Math.floor(Math.random() * 20) + 5;
            await User.updateOne({ _id: user._id }, { 
                $set: { followerCount: followers, followingCount: following } 
            });
        }
        console.log('✅ Social simulation complete.');

        console.log('🎉 Database seeding perfectly complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

runSeed();
