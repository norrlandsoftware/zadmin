#!/bin/bash

echo "Build zadmin docker image version=$1"
docker build --platform linux/amd64 -t zadmin .

echo "Tag zadmin docker image"
docker tag zadmin lboff/zadmin:$1
docker tag zadmin lboff/zadmin:latest

echo "Push on the repository"
docker push lboff/zadmin:$1
docker push lboff/zadmin:latest