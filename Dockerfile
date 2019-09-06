# Nos traemos la imagen más actual de node. Esta es la que usaremos para el API
FROM node:latest

# Cambiamos el usuario y grupos por seguridad
RUN groupmod -g 999 -n acl node
RUN usermod -u 999 -g 999 -d /home/acluser -l acluser node

LABEL vendor="ACL Systems S.A de C.V."
LABEL description="Alumno"
LABEL info="info@aclsystems.mx"

# Cambiamos la hora
RUN echo "America/Mexico_City" > /etc/timezone
RUN rm /etc/localtime
RUN dpkg-reconfigure -f noninteractive tzdata

# Imagen para producción (esto evita instalar dev-dependency)
ENV NODE_ENV production

# Copiamos el archivo de definiciones de npm (todo lo que necesita la aplicación para funcionar)
COPY package.json /tmp/package.json

# Le decimos a NPM que instale todo lo que necesitamos
RUN cd /tmp && npm install

# Creamos el directorio donde residirá la aplicación
RUN mkdir -p /usr/src/app && cp -a /tmp/node_modules /usr/src/app && cp /tmp/package.json /usr/src/app && chown -R acluser:acl /usr/src/app && chmod 750 -R /usr/src/app

# Creamos el directorio para datos
RUN mkdir -p /usr/src/data && chown -R acluser:acl /usr/src/data && chmod 750 -R /usr/src/data
RUN mkdir -p /usr/src/logs && chown -R acluser:acl /usr/src/logs && chmod 750 -R /usr/src/logs

# Modificamos el directorio node a acluser
RUN mv /home/node /home/acluser && chown -R acluser:acl /home/acluser && chmod 750 -R /home/acluser

# Indicamos el directorio de trabajo, que es el que acabamos de crear
WORKDIR /usr/src/app

# Copiamos la aplicacion por archivos y directorios
# Comenzando con aquellos que menos se modifican
# Dejando al último los que se modifican más como la versión
# Y modificamos propiedad y permisos

# index.js
COPY index.js index.js
RUN chown acluser:acl /usr/src/app/index.js && chmod 750 /usr/src/app/index.js

# app.js
COPY app.js app.js
RUN chown acluser:acl /usr/src/app/app.js && chmod 750 /usr/src/app/app.js

# /config
COPY config config/
RUN chown -R acluser:acl /usr/src/app/config && chmod 750 -R /usr/src/app/config

# /shared
COPY shared shared/
RUN chown -R acluser:acl /usr/src/app/shared && chmod 750 -R /usr/src/app/shared

# /src
COPY src src/
RUN chown -R acluser:acl /usr/src/app/src && chmod 750 -R /usr/src/app/src

# /middleware
COPY middleware middleware/
RUN chown -R acluser:acl /usr/src/app/middleware && chmod 750 -R /usr/src/app/middleware

# /routes
COPY routes routes/
RUN chown -R acluser:acl /usr/src/app/routes && chmod 750 -R /usr/src/app/routes

# /controllers
COPY controllers controllers/
RUN chown -R acluser:acl /usr/src/app/controllers && chmod 750 -R /usr/src/app/controllers

# version
COPY version version/
RUN chown acluser:acl /usr/src/app/version && chmod 750 /usr/src/app/version

# Le decimos a NPM que instale PM2
# RUN npm install pm2 -g

# Se indica el puerto que usará la aplicación en este caso 3050
EXPOSE 3050

# Usuario con el que arrancará la aplicación
USER acluser

# Comando para arrancar nuestra aplicación
CMD ["npm", "start"]
# Comando para arrancar aplicación con control de procesos (cluster)
#CMD ["pm2-docker", "process.yml"]

# Aplicación DOCKERIZADA y Clusterizada!!!
