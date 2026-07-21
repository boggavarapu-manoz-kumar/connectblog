const mongoose = require('mongoose');
const User = require('../models/User.model');
const Post = require('../models/Post.model');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        const userCount = await User.countDocuments();
        const postCount = await Post.countDocuments();

        if (userCount > 0 && postCount > 0) {
            console.log('Database already has users and posts, skipping seed.');
            return;
        }

        console.log('Seeding initial data...');


        // Create a demo user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const demoUser = await User.create({
            username: 'demo_user',
            email: 'demo@example.com',
            password: 'password123', // Model pre-save will hash it too, but just in case
            bio: 'Welcome to ConnectBlog! This is a demo account.',
            profilePic: 'https://ui-avatars.com/api/?name=Demo+User&background=0ea5e9&color=fff&bold=true'
        });

        console.log('User created:', demoUser.username);

        // Create some posts
        await Post.create([
            {
                title: 'Welcome to ConnectBlog!',
                content: 'This is the first post on the platform. ConnectBlog is a modern, real-world blogging platform for everyone.',
                author: demoUser._id,
                image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
                hashtags: ['welcome', 'connectblog', 'tech']
            },
            {
                title: 'Exploring the Real World',
                content: 'Building software that works seamlessly is the goal of every developer. ConnectBlog aims to provide that experience.',
                author: demoUser._id,
                image: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
                hashtags: ['development', 'software', 'smooth']
            }
        ]);

        console.log('Demo posts created!');
        console.log('Seeding complete! Log in with: demo@example.com / password123');

    } catch (error) {
        console.error('Error seeding data:', error);
    }
};

module.exports = seedData;
