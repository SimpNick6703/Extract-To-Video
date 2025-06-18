FROM node:18-slim

# Install necessary packages including FFmpeg
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome Stable and fonts
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy application code
COPY . .

# Create output directory
RUN mkdir -p /app/output /app/frames

# Set permissions
RUN chmod -R 755 /app

# Expose port for any potential server usage
EXPOSE 3000

# Run the application
CMD ["bash", "docker-run.sh"]
