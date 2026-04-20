# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Copy the rest of the application files
COPY . .

# Build the NestJS app
RUN npm run build

# Expose the application port change if needed
EXPOSE 3000

# Specify environment variables (or use a .env file)
ENV NODE_ENV=production

# Run the application
CMD ["node", "dist/main.js"]
