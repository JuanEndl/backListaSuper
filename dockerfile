# Imagen base oficial de Node
FROM node:22

# Directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copio package.json primero para instalar dependencias
COPY package*.json ./

# Instalo dependencias
RUN npm install

# Copio el resto del código (pero como vamos a usar volumen, no es estrictamente necesario)
COPY . .

# Expongo el puerto
EXPOSE 5000

# Comando de arranque (usa nodemon en vez de node)
CMD ["node", "backListaSuper.js"]
