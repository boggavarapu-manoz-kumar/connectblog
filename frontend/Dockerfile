# Build Stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
# Force legacy peer deps if needed by some older react packages
RUN npm ci --legacy-peer-deps
COPY . .
# Build the Vite project
RUN npm run build

# Production Stage (Nginx)
FROM nginx:alpine
# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built React app to Nginx's web root
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
