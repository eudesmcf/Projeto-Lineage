# Frontend Dockerfile - Data Lineage Manager
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
ENV HOST=0.0.0.0
ENV VITE_API_BASE_URL=http://localhost:5243/api
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
