#/bin/bash

docker run --name cache -p 7890:7890 -d aclsystems/cache:latest;docker ps -a
