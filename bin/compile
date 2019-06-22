#!/usr/bin/env bash
indent() {
    sed -u 's/^/      /'
}

BUILD_DIR="$1"
CACHE_DIR="$2"
ENV_DIR="$3"
STAGE="$(mktemp -d)"

if [ ! -f "${ENV_DIR}/APP_BASE" ]; then
    echo "APP_BASE was not set. Aborting" | indent
    exit 1
fi
APP_BASE="$(cat "${ENV_DIR}/APP_BASE")"

(
    mv "${BUILD_DIR}/${APP_BASE}" "${STAGE}" &&
    rm -rf "${BUILD_DIR}" &&
    mv "${STAGE}/$(basename "$APP_BASE")" "${BUILD_DIR}"
)

if [ $? -ne 0 ]; then
    echo "FAILED to copy directory into place" | indent
    exit 1
fi

echo "Copied ${APP_BASE} to root of app successfully" | indent
