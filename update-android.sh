#!/bin/bash

set -xe

cd src && npm run build || true

if [ -d ../fk-networking ]; then
	pushd ../fk-networking
	./gradlew clean build
	cp ./app/build/outputs/aar/app-debug.aar ../nativescript-conservify/src/platforms/android/fk-networking.aar
	popd
fi
