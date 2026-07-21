# ConnectBlog Deployment Guide

This guide outlines the optimal, production-ready deployment strategy for the ConnectBlog MERN stack application. We utilize **Render** for the backend (due to robust WebSocket/Socket.io support) and **Vercel** for the frontend (for best-in-class Edge caching and global CDN delivery).

## Architecture

- **Frontend:** React + Vite (Deployed on Vercel)
- **Backend:** Node.js + Express + Socket.io (Deployed on Render)
- **Database:** MongoDB Atlas
- **Storage:** Cloudinary

---

## 1. Backend Deployment (Render)

1. Create a new **Web Service** on [Render](https://render.com).
2. Connect this GitHub repository.
3. Configuration:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Set the following **Environment Variables**:
   - `PORT`: `5000`
   - `MONGO_URI`: *Your MongoDB connection string*
   - `JWT_SECRET`: *Your JWT signing secret*
   - `CLOUDINARY_CLOUD_NAME`: *Cloudinary credentials*
   - `CLOUDINARY_API_KEY`: *Cloudinary credentials*
   - `CLOUDINARY_API_SECRET`: *Cloudinary credentials*
   - `FRONTEND_URL`: *Leave blank initially. Update once Vercel is deployed.*

> **Keep-Alive Note:** The backend implements a self-pinging keep-alive mechanism to prevent the Render free-tier from sleeping. Once deployed, add `BACKEND_URL` to your environment variables pointing to the Render URL.

---

## 2. Frontend Deployment (Vercel)

1. Create a new **Project** on [Vercel](https://vercel.com).
2. Import this GitHub repository.
3. Configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
4. Set the following **Environment Variables**:
   - `VITE_API_URL`: *Your Render backend URL (e.g., https://connectblog-backend.onrender.com)*
5. Deploy the application.

---

## 3. Finalization

1. Return to your Render backend configuration.
2. Update the `FRONTEND_URL` environment variable with your new Vercel URL to properly configure CORS.
3. Trigger a manual deploy on Render to apply the new environment variables.

Your full-stack application is now live, optimized, and connected.
