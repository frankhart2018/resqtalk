#!/usr/bin/env bash
sudo docker-compose up -d
sudo docker exec $(sudo docker ps -a | grep ollama | awk '{print($1);}') ollama pull gemma3n:latest