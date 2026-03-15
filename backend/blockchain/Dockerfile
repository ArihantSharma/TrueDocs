FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the project
COPY . .

# Expose the Hardhat node RPC port
EXPOSE 8545

# Entrypoint: start node, wait, then deploy contract
CMD ["sh", "start_node.sh"]
