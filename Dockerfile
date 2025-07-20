FROM node:24-slim

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
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy shell scripts and fix line endings
COPY *.sh ./
RUN sed -i 's/\r$//' *.sh && chmod +x *.sh

# Copy remaining application code
COPY *.js ./
COPY *.md ./

# Create output directory
RUN mkdir -p /app/output /app/frames

# Set permissions
RUN chmod -R 755 /app

# Expose port for any potential server usage
EXPOSE 3000

# Run the application
CMD ["bash", "docker-run.sh"]
