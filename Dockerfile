# Use an official Node.js image as a base
FROM node:18

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy app files to the container
COPY package*.json ./
COPY . .

# Install dependencies
RUN npm install

# Expose the web app's port (from .env: PORT=3000)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
