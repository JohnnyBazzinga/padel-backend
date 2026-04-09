FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run db:generate

EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate:prod && npm run start:dev"]
