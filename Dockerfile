FROM node:10-alpine

WORKDIR /tmp/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 8222
WORKDIR /tmp/app/dist
CMD ["node", "index.js"]