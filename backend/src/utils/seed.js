const mongoose = require('mongoose');
const User = require('../models/User.model');
const Post = require('../models/Post.model');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

const seedData = async () => {
    try {
        const userCount = await User.countDocuments();
        if (userCount >= 50) {
            console.log('Database already has enough users, skipping seed.');
            return;
        }

        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Post.deleteMany({});

        console.log('Generating 50 realistic users...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const usersData = [];
        const existingUsernames = new Set();
        const existingEmails = new Set();

        for (let i = 0; i < 50; i++) {
            let firstName = faker.person.firstName();
            let lastName = faker.person.lastName();
            let username = faker.internet.username({ firstName, lastName }).toLowerCase().replace(/[^a-z0-9]/g, '');
            let email = faker.internet.email({ firstName, lastName }).toLowerCase();

            // Ensure uniqueness
            while (existingUsernames.has(username)) {
                username += Math.floor(Math.random() * 100);
            }
            while (existingEmails.has(email)) {
                email = `alt_${Math.floor(Math.random() * 1000)}_${email}`;
            }

            existingUsernames.add(username);
            existingEmails.add(email);

            usersData.push({
                username,
                email,
                password: hashedPassword,
                name: `${firstName} ${lastName}`,
                bio: faker.person.bio(),
                profilePic: faker.image.avatar(),
                followers: [],
                following: [],
                bookmarks: []
            });
        }

        // Insert users
        const insertedUsers = await User.insertMany(usersData);
        console.log('Users created successfully.');

        console.log('Generating relationships (followers/following)...');
        for (let user of insertedUsers) {
            // Pick a random number of followers and following (between 5 and 20)
            const numFollowing = faker.number.int({ min: 5, max: 20 });
            
            // Randomly pick other users to follow
            const shuffledUsers = [...insertedUsers].sort(() => 0.5 - Math.random());
            const usersToFollow = shuffledUsers.filter(u => u._id.toString() !== user._id.toString()).slice(0, numFollowing);

            user.following = usersToFollow.map(u => u._id);
            await user.save();

            // Update followers of those users
            for (let targetUser of usersToFollow) {
                await User.findByIdAndUpdate(targetUser._id, {
                    $addToSet: { followers: user._id }
                });
            }
        }
        console.log('Relationships established.');

        console.log('Generating realistic posts...');
        const postsData = [];
        for (let i = 0; i < 150; i++) {
            // Pick a random author
            const author = faker.helpers.arrayElement(insertedUsers);

            postsData.push({
                title: faker.lorem.sentence({ min: 4, max: 8 }),
                content: faker.lorem.paragraphs({ min: 2, max: 5 }),
                author: author._id,
                image: faker.image.urlLoremFlickr({ category: 'technology,nature,abstract', width: 800, height: 600 }),
                hashtags: Array.from({ length: faker.number.int({ min: 2, max: 5 }) }).map(() => faker.word.sample()),
                likes: faker.helpers.arrayElements(insertedUsers.map(u => u._id), faker.number.int({ min: 0, max: 30 })),
                comments: []
            });
        }

        await Post.insertMany(postsData);
        console.log('150 posts created successfully.');

        console.log('Database seeding complete! All dummy data is highly realistic.');
        console.log('You can log in as any user with password: password123');

    } catch (error) {
        console.error('Error seeding data:', error);
    }
};

module.exports = seedData;
