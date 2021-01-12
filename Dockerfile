# Nos traemos la imagen más actual de node. Esta es la que usaremos para el API
FROM node:alpine3.12 AS BUILD_IMAGE

RUN apk update && apk add curl bash && rm -rf /var/cache/apk/*

RUN curl -sfL https://install.goreleaser.com/github.com/tj/node-prune.sh | bash -s -- -b /usr/local/bin

COPY package.json /tmp/package.json

RUN cd /tmp && npm install --production && npm prune --production
RUN cd /tmp && /usr/local/bin/node-prune

FROM node:alpine3.12

RUN apk update && apk add shadow && apk add tzdata && rm -rf /var/cache/apk/*

# Cambiamos el usuario y grupos por seguridad
RUN groupmod -g 1998 -n acl node
RUN usermod -u 1998 -g 1998 -d /home/acluser -l acluser node

LABEL vendor="ACL Systems S.A de C.V."
LABEL description="ACL Systems - Alumno"
LABEL info="info@aclsystems.mx"

# Cambiamos la hora
RUN echo "America/Mexico_City" > /etc/timezone
RUN cp /usr/share/zoneinfo/America/Mexico_City /etc/localtime
RUN date
RUN apk del shadow && apk del tzdata

# Imagen para producción (esto evita instalar dev-dependency)
ENV NODE_ENV production

# Creamos el directorio donde residirá la aplicación
RUN mkdir -p /usr/src/app

# Indicamos el directorio de trabajo, que es el que acabamos de crear
WORKDIR /usr/src/app

COPY --from=BUILD_IMAGE /tmp/node_modules ./node_modules
COPY --from=BUILD_IMAGE /tmp/package.json .
RUN chown -R acluser:acl /usr/src/app && chmod 750 -R /usr/src/app

# Creamos el directorio para datos
RUN mkdir -p /usr/src/data/files && chown -R acluser:acl /usr/src/data && chmod 750 -R /usr/src/data
RUN mkdir -p /usr/src/logs && chown -R acluser:acl /usr/src/logs && chmod 750 -R /usr/src/logs

# Modificamos el directorio node a acluser
RUN mv /home/node /home/acluser && chown -R acluser:acl /home/acluser && chmod 750 -R /home/acluser

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

# Se indica el puerto que usará la aplicación en este caso 3050
EXPOSE 3050

# Usuario con el que arrancará la aplicación
USER acluser

# Comando para arrancar nuestra aplicación
CMD ["npm", "start"]

# Aplicación DOCKERIZADA y Clusterizada!!!
