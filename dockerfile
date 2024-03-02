FROM node:18.17.1

WORKDIR /usr/src/app

COPY . /usr/src/app

RUN npm install

EXPOSE 3003

CMD ["npm", "start"]