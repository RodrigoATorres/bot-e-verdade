#!/bin/sh
killall node -9
rm -r node_modules
npm install
cd /usr/src/app
node src/app.js