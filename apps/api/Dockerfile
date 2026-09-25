FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --global npm@11.6.0 && npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
EXPOSE 3001
CMD ["npm", "start"]
