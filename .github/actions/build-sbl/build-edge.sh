#!/usr/bin/env bash
set -euo pipefail

device="${1:-edge1040}"
case "$device" in
  edge1040|edge1050) ;;
  *) echo "Unsupported device: $device (expected edge1040 or edge1050)" >&2; exit 1 ;;
esac

# SDK 9.2.0 with device definitions from 2026-08-31. Pin the image so a
# third-party update cannot silently change the compiler or build environment.
image='ghcr.io/matco/connectiq-tester@sha256:64958e8fd2925d0c4986d72a9aa9d8e2101297a881354aab0118be2f1dc22105'
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
output_dir="$repo_root/Build/$device"
mkdir -p "$output_dir"

docker run --rm --platform linux/amd64 \
  --network none \
  --mount "type=bind,source=$repo_root/Source/SmartBikeLights,target=/source,readonly" \
  --mount "type=bind,source=$output_dir,target=/output" \
  --entrypoint /bin/bash \
  "$image" -euo pipefail -c '
    cp -R /source /tmp/SmartBikeLights
    cd /tmp/SmartBikeLights

    # This generated file is gitignored. Its only preprocessing directive
    # includes the private ANT key for TransmitR remotes. The supplied light
    # configurations do not use these remotes; retain the commented directive.
    cp source-preprocess/BikeLightSensor.mc source-generated/BikeLightSensor.LightSensor.mc

    # The repository key is public and intended for local/test builds only.
    monkeyc -f monkey.jungle -d "$1" -r -w \
      -y unit_test_key -o /tmp/SmartBikeLights.prg
    test -s /tmp/SmartBikeLights.prg
    cp /tmp/SmartBikeLights.prg /output/SmartBikeLights.prg
    chmod 644 /output/SmartBikeLights.prg
  ' build-smartbikelights "$device"
