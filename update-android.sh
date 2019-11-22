#!/bin/bash

set -xe

if [ -d ../fk-networking ]; then
	pushd ../fk-networking
	./gradlew clean build
	cp ./app/build/outputs/aar/app-debug.aar ../nativescript-conservify/src/platforms/android/fk-networking.aar
	popd
fi
