# Official Playwright image — comes with Node, all supported browsers,
# and their system dependencies pre-installed
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /tests

# Install test runner dependencies
COPY package.json ./
RUN npm install

# Copy test files and config
COPY . .

# Run all tests in the e2e/ directory
CMD ["npx", "playwright", "test"]
