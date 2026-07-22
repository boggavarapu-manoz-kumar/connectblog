require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User.model');
const Post = require('./src/models/Post.model');

const indianUsers = [
    { username: 'arjun_tech', email: 'arjun@example.com', name: 'Arjun Sharma', bio: 'Full-stack developer from Bangalore. Love building scalable web apps with MERN stack.' },
    { username: 'priya_codes', email: 'priya@example.com', name: 'Priya Patel', bio: 'UI/UX Designer & Frontend Developer. Passionate about creating beautiful user experiences.' },
    { username: 'rahul_dev', email: 'rahul@example.com', name: 'Rahul Desai', bio: 'Cloud Architect and Open Source contributor. Based in Pune.' },
    { username: 'sneha_writes', email: 'sneha@example.com', name: 'Sneha Reddy', bio: 'Tech blogger and content creator. I write about AI, Web3, and the future of tech.' },
    { username: 'vikram_ai', email: 'vikram@example.com', name: 'Vikram Singh', bio: 'Machine Learning Engineer. Exploring generative AI and LLMs in Hyderabad.' },
    { username: 'kavya_design', email: 'kavya@example.com', name: 'Kavya Iyer', bio: 'Product Designer at a leading fintech startup. Minimalism is my mantra.' },
    { username: 'rohit_startup', email: 'rohit@example.com', name: 'Rohit Verma', bio: 'Founder & CEO. Building tools for the next generation of remote workers in Delhi.' },
    { username: 'ananya_data', email: 'ananya@example.com', name: 'Ananya Gupta', bio: 'Data Scientist by day, gamer by night. Python enthusiast.' },
    { username: 'karan_cyber', email: 'karan@example.com', name: 'Karan Malhotra', bio: 'Cybersecurity analyst. Securing the web one application at a time.' },
    { username: 'neha_mobile', email: 'neha@example.com', name: 'Neha Joshi', bio: 'iOS & Android developer. Flutter expert from Mumbai.' },
];

const postTemplates = [
    { title: 'The Future of Web Development in India', content: 'Web development in India is evolving at a breakneck pace. With the rise of the MERN stack and Next.js, startups in Bangalore and Pune are building world-class products. What do you think is the next big framework?', tags: ['webdev', 'india', 'tech'] },
    { title: 'Why I Switched from React to Vue (And Back Again)', content: 'Framework fatigue is real! I spent 6 months exploring Vue.js, and while the composition API is fantastic, the massive ecosystem of React ultimately brought me back. Here is my complete journey and technical breakdown.', tags: ['react', 'vue', 'frontend'] },
    { title: 'Understanding AI: A Guide for Beginners', content: 'Artificial Intelligence is no longer just a buzzword. From ChatGPT to Midjourney, generative AI is reshaping how we work. In this post, I break down the basics of LLMs and how you can integrate them into your apps today.', tags: ['ai', 'machinelearning', 'future'] },
    { title: 'My Journey Building a SaaS Startup', content: 'Starting a company is hard. Building a SaaS product from scratch took me 12 months of sleepless nights. Today, we hit 1000 MRR! Here are my top 5 lessons learned regarding marketing and product-market fit.', tags: ['startup', 'saas', 'entrepreneurship'] },
    { title: 'Top 5 VS Code Extensions for Productivity', content: 'If you are not using Prettier, ESLint, and GitHub Copilot, you are missing out. But what about the hidden gems? Let me show you 5 VS Code extensions that will double your coding speed immediately.', tags: ['vscode', 'productivity', 'coding'] },
    { title: 'Mastering CSS Grid in 2026', content: 'CSS Grid has completely changed how we build layouts. Stop relying on heavy UI frameworks for simple dashboards. Let us dive deep into advanced grid-template-areas and responsive design techniques without media queries.', tags: ['css', 'webdesign', 'frontend'] },
    { title: 'The Rise of Remote Work Culture', content: 'Working from home is the new norm, especially in the tech industry. How do you maintain work-life balance when your office is your bedroom? Sharing my daily routine and best practices for remote developers.', tags: ['remotework', 'lifestyle', 'developer'] },
    { title: 'Exploring the Streets of Mumbai: A Photoblog', content: 'Taking a break from coding! Spent the weekend capturing the vibrant streets, incredible food, and historical architecture of South Mumbai. The energy here is unmatched.', tags: ['travel', 'mumbai', 'photography'] },
    { title: 'How to Secure Your Node.js APIs', content: 'Security is not an afterthought. Are you using Helmet? Rate limiting? CORS correctly? Here is a comprehensive checklist to secure your Express.js backend against common OWASP vulnerabilities before deploying to production.', tags: ['security', 'nodejs', 'backend'] },
    { title: 'The Importance of Open Source Contributions', content: 'My career skyrocketed after I started contributing to open source. It is not just about writing code; it is about community, reviewing PRs, and learning from senior engineers globally. Here is how you can start today.', tags: ['opensource', 'community', 'career'] }
];

const postImages = [
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to Database:', process.env.MONGO_URI);

        console.log('Wiping database...');
        await User.deleteMany({});
        await Post.deleteMany({});
        console.log('Database wiped.');

        console.log('Creating 10 realistic Indian users...');
        const createdUsers = [];
        for (let i = 0; i < indianUsers.length; i++) {
            const u = indianUsers[i];
            const nameParts = u.name.split(' ');
            const user = await User.create({
                username: u.username,
                email: u.email,
                password: 'password123',
                bio: u.bio,
                profilePic: `https://ui-avatars.com/api/?name=${nameParts[0]}+${nameParts[1]}&background=random&color=fff&bold=true`
            });
            createdUsers.push(user);
        }

        console.log('Users created successfully.');

        console.log('Creating 20 realistic posts (2 per user)...');
        for (let i = 0; i < createdUsers.length; i++) {
            const user = createdUsers[i];
            
            // Post 1 for this user
            const p1 = postTemplates[(i * 2) % postTemplates.length];
            await Post.create({
                title: p1.title,
                content: p1.content,
                author: user._id,
                image: postImages[(i * 2) % postImages.length],
                hashtags: p1.tags
            });

            // Post 2 for this user
            const p2 = postTemplates[((i * 2) + 1) % postTemplates.length];
            await Post.create({
                title: p2.title,
                content: p2.content,
                author: user._id,
                image: postImages[((i * 2) + 1) % postImages.length],
                hashtags: p2.tags
            });
        }
        
        console.log('Posts created successfully.');
        console.log('Seeding complete! You can login with any user e.g. arjun@example.com / password123');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedDB();
