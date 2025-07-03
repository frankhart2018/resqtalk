#!/usr/bin/env bash
sudo docker-compose up -d
sudo docker exec resqtalk_ollama_1 ollama pull gemma3n:latest