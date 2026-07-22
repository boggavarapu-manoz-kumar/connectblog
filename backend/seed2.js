const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Load models
const User = require('./src/models/User.model');
const Post = require('./src/models/Post.model');
const Comment = require('./src/models/Comment.model');

const BIOS = [
    "B.Tech CSE at SRM Chennai 📚 | Coding & Filter Coffee ☕",
    "AP boy living in Chennai 🌴 | Vibe hai bhai vibes 💥",
    "Full time student, part time chapri 😂 | Riding KTM Duke 🏍️",
    "Just a local Chennai paiyan exploring the world 🌍",
    "Student at VIT | Coding all night, sleeping all day 💻💤",
    "Andhra kurradu 🔥 | B.Tech life is just assignments and pain 😭",
    "Software Engineer in making | Tech bro aesthetic 🚀",
    "Local street style 💯 | No filter, just me | AP vibes",
    "Chennai weather is hot but my style is hotter 🔥😂",
    "Just passed out from college, looking for job... and food 🍕"
];

const POST_TEMPLATES = [
    { title: "B.Tech life in a nutshell 😂", content: "When the professor says 'this is important for the exam' but you are already sleeping in the back bench. #college #btech #engineering #comedy", tags: ["college", "comedy", "btech"] },
    { title: "Chennai traffic is something else 🚗", content: "Spent 2 hours in OMR traffic just to write a 1 hour exam. Peak Chennai moments. #chennai #studentlife #omr", tags: ["chennai", "studentlife"] },
    { title: "KTM rides with the boys 🏍️🔥", content: "Late night rides, empty roads, and good vibes. This is the real aesthetic. #chapri #ktm #vibes #streetstyle", tags: ["streetstyle", "vibes"] },
    { title: "Hostel food vs Mom's food 😭", content: "Day 45 of surviving on Maggi because hostel mess food is a literal biohazard. Send help (and biryani). #hostel #foodie #ap", tags: ["hostel", "biryani"] },
    { title: "Placements season got me like 😵‍💫", content: "Doing Leetcode blind 75 while reconsidering every life choice I've ever made. Wish me luck guys. #coding #placements #techbro", tags: ["coding", "placements"] },
    { title: "Filter Coffee > Everything ☕", content: "Nothing beats a strong filter kaapi in the morning at Mylapore. Pure bliss. #coffee #chennai #morning", tags: ["coffee", "chennai"] },
    { title: "That one friend who never studies 💀", content: "My bro literally opened the textbook 10 mins before the exam and still scored more than me. How?! #exams #comedy #relatable", tags: ["comedy", "exams"] },
    { title: "Local street style check 💯", content: "Dripping too hard today. AP boys always got the best fits. #style #fashion #ootd", tags: ["style", "fashion"] },
    { title: "Weekend trip to Pondy! 🏖️", content: "Finally escaped the college matrix for the weekend. Pondicherry hits different with the squad. #travel #weekend #pondy", tags: ["travel"] },
    { title: "POV: You're an engineering student 💻", content: "Copy-pasting StackOverflow code and praying it runs on the first try. #developer #engineering #struggle", tags: ["developer"] }
];

const COMMENTS = [
    "Bro so true 😂😂",
    "Lit 🔥🔥",
    "Where is this place??",
    "Literally me yesterday 😭",
    "Bhai crazy fit 💯",
    "Send the location fast",
    "Vibe hai 💥",
    "Hostel food is a crime fr 😂",
    "All the best for placements bro!",
    "KTM looking sick 🔥"
];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateRandomId = () => Math.random().toString(36).substring(2, 10);

const GENERATE_IMAGE_URL = () => `https://picsum.photos/seed/${generateRandomId()}/800/800`;

const generateUsers = async () => {
    console.log('Fetching 100 regional Indian profiles from RandomUser API...');
    const response = await fetch('https://randomuser.me/api/?results=100&nat=in');
    const data = await response.json();
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123!', salt);

    const usersToInsert = data.results.map((u, i) => {
        return {
            username: `user_${u.login.username}_${Math.floor(Math.random() * 1000)}`,
            email: `phase2_${i}_${u.email}`,
            password: hashedPassword,
            profilePic: u.picture.large,
            bio: randomItem(BIOS),
            pronouns: i % 2 === 0 ? 'He/Him' : 'She/Her',
            coverImage: GENERATE_IMAGE_URL(),
            followerCount: 0,
            followingCount: 0,
            coins: Math.floor(Math.random() * 500)
        };
    });

    return usersToInsert;
};

const runSeed = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env');
        }

        console.log('Connecting to production MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB.');

        // 1. Users
        const usersData = await generateUsers();
        console.log(`Inserting ${usersData.length} new users...`);
        const insertedUsers = await User.insertMany(usersData);
        console.log('✅ Users inserted.');

        // 2. Posts
        console.log('Generating posts...');
        const postsData = [];
        insertedUsers.forEach(user => {
            const numPosts = Math.floor(Math.random() * 2) + 2; // 2 or 3
            for (let i = 0; i < numPosts; i++) {
                const template = randomItem(POST_TEMPLATES);
                postsData.push({
                    title: template.title,
                    content: template.content,
                    image: GENERATE_IMAGE_URL(),
                    hashtags: template.tags,
                    author: user._id,
                    likeCount: Math.floor(Math.random() * 50) + 10, // Pre-fill likes
                    isArchived: false,
                    createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000))
                });
            }
        });

        console.log(`Inserting ${postsData.length} robust image posts...`);
        const insertedPosts = await Post.insertMany(postsData);
        console.log('✅ Posts inserted.');

        // 3. Comments
        console.log('Generating active comments section...');
        const commentsData = [];
        for (let post of insertedPosts) {
            const numComments = Math.floor(Math.random() * 4) + 2; // 2 to 5 comments per post
            for (let i = 0; i < numComments; i++) {
                const randomUser = randomItem(insertedUsers);
                commentsData.push({
                    text: randomItem(COMMENTS),
                    user: randomUser._id,
                    post: post._id,
                    createdAt: new Date(post.createdAt.getTime() + Math.floor(Math.random() * 100000000))
                });
            }
        }
        await Comment.insertMany(commentsData);
        console.log(`✅ ${commentsData.length} Comments inserted.`);

        // 4. Followers/Following
        for (let user of insertedUsers) {
            const followers = Math.floor(Math.random() * 50) + 10;
            const following = Math.floor(Math.random() * 30) + 10;
            await User.updateOne({ _id: user._id }, { 
                $set: { followerCount: followers, followingCount: following } 
            });
        }
        
        console.log('🎉 Phase 2 Database Seeding perfectly complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

runSeed();
