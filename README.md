# 🚀 ConnectBlog - Modern Social Blogging Platform

![MERN Stack](https://img.shields.io/badge/MERN-Stack-000000?style=for-the-badge&logo=mongodb&logoColor=green)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**ConnectBlog** is a full-stack, production-ready social blogging application built with the MERN stack (MongoDB, Express, React, Node.js). It features a robust authentication system, real-time CRUD operations, a responsive UI designed with Tailwind CSS, and a scalable backend architecture.

Designed to mimic real-world application standards, ConnectBlog includes comprehensive error handling, secure password hashing, JWT authentication, and a modular folder structure for maintainability.

---

## ✨ Features

### 🔐 Authentication & Security
- **Secure User Registration & Login**: Validated inputs with error feedback.
- **JWT Authentication**: Secure, stateless authentication using JSON Web Tokens.
- **Password Hashing**: Industry-standard bcrypt hashing for user passwords.
- **Protected Routes**: Middleware to secure private API endpoints and frontend pages.
- **Profile Management**: Update user details, bio, and profile pictures.

### 📝 Content Management
- **Create & Publish**: Rich text post creation with titling and content.
- **Feed System**: Dynamic homepage feed showing latest community posts.
- **Interactive Loading**: Skeleton loaders and toast notifications for better UX.
- **Search & Filter**: (Future Scope) Find posts by tags or authors.

### 🎨 UI/UX Design
- **Modern Interface**: Clean, glassmorphic design elements using Tailwind CSS.
- **Responsive Layout**: Fully optimized for mobile, tablet, and desktop.
- **Real-time Feedback**: Instant visual feedback for actions (likes, posts, errors).
- **Dark/Light Mode**: (Architecture ready for implementation).

---

## 🛠 Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React.js (Vite) | High-performance UI library with fast build tooling. |
| **Styling** | Tailwind CSS | Utility-first CSS framework for rapid UI development. |
| **State Management** | Context API | Built-in React state management for auth and user data. |
| **Backend** | Node.js & Express | Scalable server-side runtime and framework. |
| **Database** | MongoDB & Mongoose | NoSQL database with elegant object modeling. |
| **Authentication** | JWT & Bcrypt | Secure token-based auth and password encryption. |

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites
- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MongoDB** (running locally or a cloud URI)

### Quick Start (Recommended)

We've provided a helper script to automate the setup and launch of both the frontend and backend servers.

1.  **Clone the repository**
    ```bash
    git clone https://github.com/boggavarapu-manoz-kumar/connectblog.git
    cd connectblog
    ```

2.  **Run the Project**
    ```bash
    chmod +x run_project.sh
    ./run_project.sh
    ```
    *This script will automatically install dependencies for both backend and frontend, set up the environment, and start both servers.*

3.  **Access the App**
    - Frontend: `http://localhost:3000`
    - Backend API: `http://localhost:5000`

### Manual Installation

If you prefer to run services manually:

#### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file mimicking the example or use defaults
npm run dev
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Project Structure

```bash
connectblog/
├── backend/                # Server-side logic
│   ├── src/
│   │   ├── config/         # Database connection
│   │   ├── controllers/    # Route logic (Auth, Posts, Users)
│   │   ├── middleware/     # Auth checks, Error handling
│   │   ├── models/         # Mongoose Schemas
│   │   ├── routes/         # API Routes
│   │   └── utils/          # Helper functions (Token generation)
│   ├── server.js           # Entry point
│   └── .env                # Environment variables
├── frontend/               # Client-side application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth Context provider
│   │   ├── pages/          # View pages (Home, Login, Profile)
│   │   ├── services/       # API service calls (Axios)
│   │   └── styles/         # Global styles & Tailwind
│   └── vite.config.js      # Vite configuration
└── run_project.sh          # One-click startup script
```

---

## 🔌 API Reference

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user & get token
- `GET /api/auth/me` - Get current user profile

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post
- `GET /api/posts/:id` - Get single post details
- `PUT /api/posts/:id` - Update a post
- `DELETE /api/posts/:id` - Delete a post

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by Manoj Bogavarapu
</p>
