# Nos traemos la imagen más actual de node. Esta es la que usaremos para el API
FROM node:latest

# Creamos el directorio donde residirá la aplicación
RUN mkdir -p /usr/src/app

# Creamos el directorio para datos
RUN mkdir -p /usr/src/data

# Indicamos el directorio de trabajo, que es el que acabamos de crear
WORKDIR /usr/src/app

# Copiamos el archivo de definiciones de npm (todo lo que necesita la aplicación para funcionar)
COPY package.json /usr/src/app

# Le decimos a NPM que instale todo lo que necesitamos
RUN npm install

# Le decimos a NPM que instale PM2
RUN npm install pm2 -g

# Copiamos la aplicacion
COPY . /usr/src/app

# Se indica el puerto que usará la aplicación en este caso 3050
EXPOSE 3050

# Comando para arrancar nuestra aplicación
# CMD ["npm", "start"]
# Comando para arrancar aplicación con control de procesos (cluster)
CMD ["pm2-docker", "index.js", "-i 1"]

# Aplicación DOCKERIZADA y Clusterizada!!!
